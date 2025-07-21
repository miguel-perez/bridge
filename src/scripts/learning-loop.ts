#!/usr/bin/env tsx
/**
 * Bridge Learning Loop - Streamlined Analysis
 * 
 * Analyzes test results and generates insights in a single JSON file.
 * Only appends new learnings to LEARNINGS.md when explicitly requested.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { Anthropic } from "@anthropic-ai/sdk";
import * as dotenv from 'dotenv';

dotenv.config();

interface SequentialThought {
  thought: string;
  nextThoughtNeeded: boolean;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
}

interface LearningLoopResult {
  timestamp: string;
  experimentRef: string;
  testFile: string;
  testResults: unknown;
  sequentialThoughts: SequentialThought[];
  insights: {
    patterns: string[];
    limitations: string[];
    opportunities: string[];
    recommendations: string[];
  };
  learningsToAppend?: string[];
  metadata: {
    totalThoughts: number;
    analysisTime: number;
    model: string;
  };
}

const SEQUENTIAL_THINKING_PROMPT = `You are analyzing Bridge test results through sequential thinking. 

CONTEXT:
- Bridge is an MCP (Model Context Protocol) tool for shared experiential memory
- It enables transparent memory formation between humans and AI
- All operations (experience, recall, reconsider, release) should be tested
- Reference experiment EXP-001 in EXPERIMENTS.md for learning questions

Each thought should:
- Focus on one aspect or insight about the test results
- Build on previous thoughts naturally
- Question assumptions when needed
- Draw conclusions from evidence
- Note specific evidence (test file, line numbers, tool outputs)

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:
[Write your single analytical thought about the test results here]

Next thought needed: yes

IMPORTANT: 
- Your thought MUST be enclosed in square brackets [like this]
- You MUST include "Next thought needed: yes" or "Next thought needed: no" on a new line
- Do not add any other text outside this format`;

const ANALYSIS_PROMPT = `Based on your sequential analysis, provide a structured summary of insights.

FORMAT YOUR RESPONSE EXACTLY LIKE THIS:

PATTERNS:
- First pattern observed with evidence
- Second pattern observed with evidence

LIMITATIONS:
- First limitation or constraint identified
- Second limitation if applicable

OPPORTUNITIES:
- First improvement opportunity
- Second opportunity if found

RECOMMENDATIONS:
- First specific next step
- Second recommendation if needed

IMPORTANT:
- Start each section with the header (PATTERNS:, LIMITATIONS:, etc.) on its own line
- List items with bullet points using "-"
- Be concise (one clear statement per bullet)
- Include specific evidence (e.g., "Turn 3: recall found 2 similar experiences")
- Reference experiment questions from EXP-001 when relevant`;

async function runLearningLoop(appendToLearnings: boolean = false): Promise<LearningLoopResult> {
  const startTime = Date.now();
  
  console.log('🔄 Starting Learning Loop Analysis...\n');
  
  // Find the most recent test results
  const testResultsDir = join(process.cwd(), 'test-results');
  if (!existsSync(testResultsDir)) {
    console.error('❌ No test results directory found. Run tests first with: npm test');
    process.exit(1);
  }
  
  const testFiles = readdirSync(testResultsDir)
    .filter(f => f.startsWith('test-run-') && f.endsWith('.json'))
    .sort()
    .reverse();
  
  if (testFiles.length === 0) {
    console.error('❌ No test results found. Run tests first with: npm test');
    process.exit(1);
  }
  
  const latestTestFile = testFiles[0];
  const testResults = JSON.parse(readFileSync(join(testResultsDir, latestTestFile), 'utf-8'));
  
  console.log(`📊 Analyzing test results from: ${latestTestFile}\n`);
  
  // Load documentation for context (currently unused but available for future enhancements)
  // const docs = {
  //   experiments: existsSync(join(process.cwd(), 'EXPERIMENTS.md')) 
  //     ? readFileSync(join(process.cwd(), 'EXPERIMENTS.md'), 'utf-8') 
  //     : '',
  //   learnings: existsSync(join(process.cwd(), 'LEARNINGS.md')) 
  //     ? readFileSync(join(process.cwd(), 'LEARNINGS.md'), 'utf-8') 
  //     : ''
  // };
  
  // Run sequential thinking analysis
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  const MODEL = 'claude-opus-4-20250514';
  const MAX_THOUGHTS = 8;  // Reduced from 15 to prevent timeouts
  const MAX_TOKENS = 800;
  
  console.log(`🧠 Opus is analyzing the test results...\n`);
  
  const thoughts: SequentialThought[] = [];
  let currentThought = 1;
  let continueThinking = true;
  
  // Sequential thinking loop
  while (continueThinking && currentThought <= MAX_THOUGHTS) {
    const thoughtContext = thoughts.map((t, i) => 
      `Thought ${i + 1}: ${t.thought}`
    ).join('\n\n');
    
    const thoughtPrompt = `${SEQUENTIAL_THINKING_PROMPT}

Documentation Context:
- EXPERIMENTS.md describes active experiments and learning questions
- LEARNINGS.md contains validated insights from previous tests
- Test file: ${latestTestFile}

Active Experiment (EXP-001) Questions:
- How do quality signatures evolve with conversation depth?
- What patterns emerge from accumulated experiences?
- How does similarity detection handle nuanced differences?
- What makes recall results most useful?
- When is reconsideration most valuable?

Test Results to Analyze:
${JSON.stringify(testResults, null, 2)}

Your previous thoughts:
${thoughtContext || 'None yet - this is your first thought'}

Thought ${currentThought}:`;
    
    try {
      console.log(`    🤔 Generating thought ${currentThought}...`);
      
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
        system: "You are analyzing Bridge test results. Be concise and insightful.",
        messages: [{
          role: 'user',
          content: thoughtPrompt
        }]
      });
      
      const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
      
      // Debug logging for parsing issues
      if (process.argv.includes('--debug')) {
        console.log('\n    🔍 Debug - AI response:');
        console.log('    ' + responseText.substring(0, 300) + '...\n');
      }
      
      // Parse the response - look for content in square brackets
      const thoughtMatch = responseText.match(/\[([^\]]+)\]/s); // 's' flag for multiline
      const nextMatch = responseText.match(/Next thought needed:\s*(yes|no)/i);
      
      if (thoughtMatch && thoughtMatch[1]) {
        const thought: SequentialThought = {
          thought: thoughtMatch[1].trim(),
          nextThoughtNeeded: nextMatch ? nextMatch[1].toLowerCase() === 'yes' : false,
          thoughtNumber: currentThought,
          totalThoughts: MAX_THOUGHTS
        };
        
        thoughts.push(thought);
        console.log(`    ✓ ${thought.thought.substring(0, 80)}...`);
        
        continueThinking = thought.nextThoughtNeeded;
        currentThought++;
      } else {
        // Fallback: if no brackets found, try to extract the first non-empty line as the thought
        console.log('    ⚠️  No brackets found, attempting fallback parsing...');
        const lines = responseText.split('\n').filter(line => line.trim());
        const thoughtLine = lines.find(line => 
          !line.toLowerCase().includes('next thought needed') && 
          line.length > 10
        );
        
        if (thoughtLine) {
          const thought: SequentialThought = {
            thought: thoughtLine.trim(),
            nextThoughtNeeded: nextMatch ? nextMatch[1].toLowerCase() === 'yes' : false,
            thoughtNumber: currentThought,
            totalThoughts: MAX_THOUGHTS
          };
          
          thoughts.push(thought);
          console.log(`    ✓ [Fallback] ${thought.thought.substring(0, 80)}...`);
          
          continueThinking = thought.nextThoughtNeeded;
          currentThought++;
        } else {
          console.log('    ⚠️  Failed to parse thought, stopping...');
          console.log('    Response preview:', responseText.substring(0, 150) + '...');
          continueThinking = false;
        }
      }
      
    } catch (error) {
      console.error(`    ❌ Error generating thought: ${error}`);
      continueThinking = false;
    }
  }
  
  console.log(`\n✅ Generated ${thoughts.length} thoughts\n`);
  
  // Generate structured insights
  console.log('📋 Generating structured insights...');
  
  const insightsPrompt = `${ANALYSIS_PROMPT}

Based on these sequential thoughts about the Bridge test results:
${thoughts.map((t, i) => `${i + 1}. ${t.thought}`).join('\n')}

Provide your structured analysis:`;
  
  const insightsResponse = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1500,
    temperature: 0.5,
    system: "You are summarizing Bridge test analysis. Be clear and actionable.",
    messages: [{
      role: 'user',
      content: insightsPrompt
    }]
  });
  
  const insightsText = insightsResponse.content[0].type === 'text' ? insightsResponse.content[0].text : '';
  
  // Debug insights response
  if (process.argv.includes('--debug')) {
    console.log('\n📝 Debug - Insights response:');
    console.log(insightsText.substring(0, 500) + '...\n');
  }
  
  // Parse insights
  const patterns = extractSection(insightsText, 'PATTERNS') || [];
  const limitations = extractSection(insightsText, 'LIMITATIONS') || [];
  const opportunities = extractSection(insightsText, 'OPPORTUNITIES') || [];
  const recommendations = extractSection(insightsText, 'RECOMMENDATIONS') || [];
  
  // Create the complete result
  const result: LearningLoopResult = {
    timestamp: new Date().toISOString(),
    experimentRef: 'EXP-001',
    testFile: latestTestFile,
    testResults: testResults,
    sequentialThoughts: thoughts,
    insights: {
      patterns,
      limitations,
      opportunities,
      recommendations
    },
    metadata: {
      totalThoughts: thoughts.length,
      analysisTime: (Date.now() - startTime) / 1000,
      model: MODEL
    }
  };
  
  // Save the complete analysis
  const outputPath = join(testResultsDir, `learning-loop-${Date.now()}.json`);
  writeFileSync(outputPath, JSON.stringify(result, null, 2));
  
  console.log(`\n✅ Analysis complete!`);
  console.log(`📄 Results saved to: ${outputPath}`);
  
  // Display summary
  console.log('\n📊 Summary of Insights:');
  console.log(`   Patterns: ${patterns.length}`);
  console.log(`   Limitations: ${limitations.length}`);
  console.log(`   Opportunities: ${opportunities.length}`);
  console.log(`   Recommendations: ${recommendations.length}`);
  
  // Optionally append to LEARNINGS.md
  if (appendToLearnings && (patterns.length > 0 || limitations.length > 0)) {
    console.log('\n📝 Appending new learnings to LEARNINGS.md...');
    
    const date = new Date().toISOString().split('T')[0];
    const newLearnings = `
## ${date} - Learning Loop Analysis (EXP-001)

### Patterns Observed
${patterns.map(p => `- ${p}`).join('\n')}

### Limitations Identified
${limitations.map(l => `- ${l}`).join('\n')}

### Evidence Trail
- Experiment: EXP-001 (see EXPERIMENTS.md)
- Test run: ${latestTestFile}
- Analysis: ${outputPath}
- Model: ${MODEL}
- Thoughts generated: ${thoughts.length}
`;
    
    const learningsPath = join(process.cwd(), 'LEARNINGS.md');
    const currentLearnings = readFileSync(learningsPath, 'utf-8');
    writeFileSync(learningsPath, currentLearnings + '\n' + newLearnings);
    
    console.log('✅ LEARNINGS.md updated');
  }
  
  return result;
}

function extractSection(text: string, sectionName: string): string[] {
  // Look for section header followed by content until next section or end
  const sectionRegex = new RegExp(
    `${sectionName}:\\s*\\n([\\s\\S]*?)(?=\\n[A-Z]+:|$)`, 
    'i'
  );
  const match = text.match(sectionRegex);
  
  if (match && match[1]) {
    return match[1]
      .split('\n')
      .map(line => line.replace(/^[-*•]\s*/, '').trim())
      .filter(line => line.length > 0 && !line.match(/^[A-Z]+:$/));
  }
  
  return [];
}

// Main execution
const appendFlag = process.argv.includes('--append');

runLearningLoop(appendFlag).catch(error => {
  console.error('❌ Learning loop failed:', error);
  process.exit(1);
});