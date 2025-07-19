#!/usr/bin/env tsx
/**
 * Bridge Learning Loop with Sequential Thinking
 * 
 * Analyzes test results and automatically updates documentation
 * - Reads JSON test results from test-results/scenarios/
 * - Uses sequential thinking for deeper analysis
 * - Updates LEARNINGS, EXPERIMENTS, OPPORTUNITIES, and VISION
 * - Saves analysis to test-results/learning-loop-YYYY-MM-DD.md
 * - Updates progression tracking
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { Anthropic } from "@anthropic-ai/sdk";
import * as dotenv from 'dotenv';

dotenv.config();

const OPUS_PROMPT = `You are analyzing our learning loop to extract insights and update documentation.
Your role:
1. Analyze completed experiments and test results objectively
2. Extract reusable learnings with clear evidence trails (link each learning to specific experiments/tests)
3. Generate new testable questions based on surprises
4. Check for vision drift against core philosophy
5. Map experiment IDs to learnings for traceability
6. Be honest about biases and limitations you observe

TEST METHODOLOGY:
We run three distinct test scenarios to understand Bridge's impact:
1. "autonomous-bridge" - AI self-awakening test (can Claude use Bridge for its own consciousness?)
2. "with-bridge" - Conversation with Bridge tools available
3. "without-bridge" - Same conversation without tools for comparison

Each test includes:
- Full conversation transcripts showing exact messages
- Tool usage details (when Bridge is available)  
- UX analysis evaluating conversation quality, goal achievement, and connection depth
- Error information if tests fail

KNOWN TEST RUNNER ISSUE:
The test-runner.ts makes two API calls when tools are used:
1. Initial call gets Claude's response with tool use
2. After tool execution, a second call gets final response
This often results in empty final responses, causing repetitive default messages.
You have access to the test-runner.ts code to identify methodological issues.

The goal is to see how Bridge changes the quality of human-AI interaction through empirical observation.

IMPORTANT: Generate updates in a structured format that can be directly applied to the documentation files.
Each update should include:
- The file to update (LEARNINGS.md, EXPERIMENTS.md, OPPORTUNITIES.md, or VISION.md)
- The specific section or location for the update
- The content to add (preserving existing content)
- Clear evidence trails for all learnings`;

// Sequential thinking prompt for deeper analysis
const SEQUENTIAL_THINKING_PROMPT = `You are analyzing Bridge test results through sequential thinking. Simply think through the problem step by step, building understanding as you go.

Each thought should:
- Focus on one aspect or insight
- Build on previous thoughts naturally
- Question assumptions when needed
- Draw conclusions from evidence

Keep your output simple:
[Your analytical thought here]

Next thought needed: yes/no`;

interface SequentialThought {
  thought: string;
  nextThoughtNeeded: boolean;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  hypothesis?: string;
  verification?: string;
  needsMoreThoughts?: boolean;
}

async function runLearningLoop() {
  // Check for test mode
  const TEST_MODE = process.argv.includes('--test-mode');
  if (TEST_MODE) {
    console.log('🧪 Running in TEST MODE (faster, fewer thoughts)\n');
  }
  
  console.log('🔄 Starting Learning Loop Analysis...\n');
  
  // Check if tests were recently run
  const testResultsDir = join(process.cwd(), 'test-results');
  
  if (!existsSync(testResultsDir)) {
    console.log('🧪 No test results found. Running bridge tests...');
    console.log('This may take a few minutes...\n');
    
    // Build first
    console.log('🔨 Building MCP server...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed\n');
    
    // Run tests
    execSync('npm run test:bridge', { stdio: 'inherit' });
    console.log('✅ Tests completed');
  } else {
    // Check if we have recent test results (within last hour)
    const files = readdirSync(testResultsDir);
    if (files.length > 0) {
      const latestFile = files
        .filter(f => f.startsWith('test-run-') && f.endsWith('.json'))
        .map(f => {
          const match = f.match(/test-run-(\d+)\.json$/);
          return match ? { file: f, timestamp: parseInt(match[1]) } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b!.timestamp - a!.timestamp)[0];
      
      if (latestFile) {
        const age = Date.now() - latestFile.timestamp;
        const ageMinutes = Math.floor(age / 60000);
        console.log(`📊 Found test results from ${ageMinutes} minutes ago`);
        
        if (ageMinutes < 60) {
          console.log('✅ Using existing test results\n');
        } else {
          console.log('⚠️  Test results are old. Running new tests...\n');
          execSync('npm run test:bridge', { stdio: 'inherit' });
        }
      }
    }
  }
  
  // Read test results
  const testResults = readBridgeTestResults();
  
  if (testResults.includes('No test results')) {
    console.log('❌ No test results found after running tests. Something went wrong.');
    return;
  }
  
  // Check if API key is set
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('❌ ANTHROPIC_API_KEY not found in environment');
    console.log('💡 Add it to your .env file');
    return;
  }
  
  // Read current documentation
  const docs = {
    vision: existsSync(join(process.cwd(), 'VISION.md')) ?
      readFileSync(join(process.cwd(), 'VISION.md'), 'utf-8') : createVisionFile(),
    opportunities: existsSync(join(process.cwd(), 'OPPORTUNITIES.md')) ? 
      readFileSync(join(process.cwd(), 'OPPORTUNITIES.md'), 'utf-8') : createOpportunitiesFile(),
    experiments: existsSync(join(process.cwd(), 'EXPERIMENTS.md')) ? 
      readFileSync(join(process.cwd(), 'EXPERIMENTS.md'), 'utf-8') : createExperimentsFile(),
    learnings: existsSync(join(process.cwd(), 'LEARNINGS.md')) ? 
      readFileSync(join(process.cwd(), 'LEARNINGS.md'), 'utf-8') : createLearningsFile(),
    philosophy: existsSync(join(process.cwd(), 'PHILOSOPHY.md')) ? 
      readFileSync(join(process.cwd(), 'PHILOSOPHY.md'), 'utf-8') : '',
    loop: existsSync(join(process.cwd(), 'LOOP.md')) ? 
      readFileSync(join(process.cwd(), 'LOOP.md'), 'utf-8') : ''
  };
  
  // Get recent commit history for context
  let commitHistory = '';
  try {
    commitHistory = execSync('git log --oneline -20', { encoding: 'utf-8' });
  } catch (e) {
    commitHistory = 'Unable to get commit history';
  }
  
  // Read test runner implementation for meta-analysis
  let testRunnerCode = '';
  try {
    testRunnerCode = readFileSync(join(process.cwd(), 'src/scripts/test-runner.ts'), 'utf-8');
  } catch (e) {
    testRunnerCode = 'Unable to read test-runner.ts';
  }
  
  // Run Opus analysis with sequential thinking
  console.log('🤖 Calling Claude Opus 4 for sequential analysis...\n');
  const analysis = await callOpusWithSequentialThinking({
    vision: docs.vision,
    opportunities: docs.opportunities,
    experiments: docs.experiments,
    learnings: docs.learnings,
    philosophy: docs.philosophy,
    loop: docs.loop,
    commitHistory,
    testResults,
    testRunnerCode
  });
  
  // Parse and apply updates
  console.log('\n📝 Analysis Complete\n');
  
  // Apply updates to documentation files
  const updates = parseAndApplyUpdates(analysis);
  
  if (updates.length > 0) {
    console.log(`\n✅ Applied ${updates.length} updates to documentation files`);
    
    // Show what changed
    console.log('\n📝 Changes made to documentation files:');
    updates.forEach(u => {
      console.log(`   - ${u.file}: ${u.summary}`);
    });
    console.log('\n💡 Review changes with: git diff');
    console.log('💡 Commit when ready with your own message');
  } else {
    console.log('\n✅ No updates needed - documentation is up to date');
  }
  
  // Save analysis for review in test-results
  const timestamp = new Date().toISOString().split('T')[0];
  const resultsDir = join(process.cwd(), 'test-results');
  if (!existsSync(resultsDir)) {
    mkdirSync(resultsDir, { recursive: true });
  }
  const outputPath = join(resultsDir, `learning-loop-${timestamp}.md`);
  writeFileSync(outputPath, analysis);
  console.log(`\n📄 Full analysis saved to: ${outputPath}`);
  
  // Update progression tracking
  updateProgressionTracking(updates.length, timestamp);
  
  // Show trend summary
  showTrendSummary();
}

async function callOpusWithSequentialThinking(docs: {
  vision: string;
  opportunities: string;
  experiments: string;
  learnings: string;
  philosophy: string;
  loop: string;
  commitHistory: string;
  testResults: string;
  testRunnerCode: string;
}): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  // Test mode configuration
  const TEST_MODE = process.argv.includes('--test-mode');
  const MAX_THOUGHTS = TEST_MODE ? 3 : 15;  // Reasonable limit to prevent timeouts
  const MODEL = TEST_MODE ? 'claude-3-5-sonnet-20241022' : 'claude-opus-4-20250514';
  const MAX_TOKENS = TEST_MODE ? 500 : 1000;  // Balanced for good thoughts without excessive length

  const thoughts: SequentialThought[] = [];
  let currentThought = 1;
  let estimatedTotal = TEST_MODE ? 3 : 8; // Initial estimate for analysis steps
  
  console.log(`🧠 ${TEST_MODE ? 'Sonnet' : 'Opus'} is thinking step by step...\n`);

  // Sequential thinking loop
  let continueThinking = true;
  while (continueThinking) {
    const thoughtContext = thoughts.map((t, i) => 
      `Thought ${i + 1}${t.isRevision ? ` (revising thought ${t.revisesThought})` : ''}: ${t.thought}`
    ).join('\n\n');

    const thoughtPrompt = `Current test results to analyze:
${docs.testResults}

Test Runner Implementation (for meta-analysis):
\`\`\`typescript
${docs.testRunnerCode.substring(0, 3000)}... [truncated for context]
\`\`\`

Your previous thoughts:
${thoughtContext || 'None yet - this is your first thought'}

Thought ${currentThought}

Analyze the test results, focusing on:
- What happened in each test scenario
- Patterns in tool usage and conversation quality  
- Differences between with/without Bridge
- Evidence of AI self-awareness in autonomous test
- Surprises or unexpected behaviors
- Test methodology issues

Provide your thought:
[Your analytical thought here]

Next thought needed: yes/no

Note: If you find yourself repeating observations, move to deeper analysis or conclude.`;

    try {
      console.log(`    🤔 Generating thought ${currentThought}...`);
      const startTime = Date.now();
      
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.7,
        system: SEQUENTIAL_THINKING_PROMPT,
        messages: [{
          role: 'user',
          content: thoughtPrompt
        }]
      });
      
      const duration = Date.now() - startTime;
      console.log(`    ⏱️  Thought ${currentThought} generated in ${(duration/1000).toFixed(1)}s`);

      const responseText = Array.isArray(response.content) ? 
        response.content.find(c => c.type === 'text')?.text || '' : 
        String(response.content);

      // Parse the structured response
      const lines = responseText.split('\n');
      let thoughtContent = '';
      let nextNeeded = false;
      let revisesThought: number | undefined;
      let hypothesis: string | undefined;
      let verification: string | undefined;
      
      // Extract structured elements - simplified
      let inThought = true;
      for (const line of lines) {
        if (line.toLowerCase().startsWith('next thought needed:')) {
          nextNeeded = line.toLowerCase().includes('yes');
          inThought = false;
        } else if (inThought) {
          thoughtContent += line + '\n';
        }
      }
      
      const thought: SequentialThought = {
        thought: thoughtContent.trim(),
        thoughtNumber: currentThought,
        totalThoughts: estimatedTotal,
        nextThoughtNeeded: nextNeeded && currentThought < MAX_THOUGHTS // Use configured max
      };

      thoughts.push(thought);
      
      // Show thought summary
      const firstLine = thought.thought.split('\n')[0];
      const preview = firstLine.length > 80 ? firstLine.substring(0, 77) + '...' : firstLine;
      console.log(`  Step ${currentThought}: ${preview}`);
      
      // Save progress after each thought
      const progressPath = join(process.cwd(), 'test-results', 'sequential-progress.json');
      const thoughtsPath = join(process.cwd(), 'test-results', `sequential-thoughts-${new Date().toISOString().split('T')[0]}.json`);
      
      const progress = {
        currentThought: thought.thoughtNumber,
        totalThoughts: thoughts.length,
        estimatedTotal,
        lastUpdate: new Date().toISOString(),
        testMode: TEST_MODE
      };
      
      // Save both progress and full thoughts
      if (!existsSync(join(process.cwd(), 'test-results'))) {
        mkdirSync(join(process.cwd(), 'test-results'), { recursive: true });
      }
      
      writeFileSync(progressPath, JSON.stringify(progress, null, 2));
      
      // Save complete thoughts array for recovery
      writeFileSync(thoughtsPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        testMode: TEST_MODE,
        thoughts: thoughts,
        progress: progress
      }, null, 2));

      if (!thought.nextThoughtNeeded) {
        console.log('\n✅ Sequential analysis complete');
        continueThinking = false;
      }

      currentThought++;
      
      // Safety limits
      if (currentThought > MAX_THOUGHTS) {
        console.log(`\n⚠️  Reached maximum thoughts limit (${MAX_THOUGHTS}). Proceeding to analysis...`);
        continueThinking = false;
      }
      
      if (currentThought > estimatedTotal) {
        estimatedTotal = Math.min(currentThought + 2, MAX_THOUGHTS); // Adjust estimate with cap
      }
    } catch (error) {
      console.error('❌ Error in sequential thinking:', error);
      // Save partial results even on error
      if (thoughts.length > 0) {
        console.log(`\n⚠️  Sequential thinking interrupted after ${thoughts.length} thoughts. Proceeding with partial analysis...`);
      }
      break;
    }
  }

  // Now generate final documentation updates based on sequential analysis
  console.log('\n📝 Generating documentation updates...');

  const thoughtSummary = thoughts.map((t, i) => {
    return `Step ${i + 1}: ${t.thought}`;
  }).join('\n\n');

  const finalPrompt = `${OPUS_PROMPT}

Based on your sequential analysis:

${thoughtSummary}

IMPORTANT: Structure your response with clear update sections using this exact format:

### UPDATE: FILENAME.md
#### Section: Section Name or Description
#### Content:
The actual content to add or update goes here...

You can include multiple updates. Each update will be applied to the specified file.
For EXPERIMENTS.md status updates, use "Section: Status Update [EXP-XXX]" format.
For VISION.md updates, only use "Section: Critical Drift Update" when core assumptions change.

Current documents:
=== PHILOSOPHY.md (Core Foundation) ===
${docs.philosophy}

=== VISION.md (North Star) ===
${docs.vision}

=== OPPORTUNITIES.md (Questions) ===
${docs.opportunities}

=== EXPERIMENTS.md (Tests) ===
${docs.experiments}

=== LEARNINGS.md (Insights) ===
${docs.learnings}

=== LOOP.md (Process) ===
${docs.loop}

=== Recent Commits ===
${docs.commitHistory}

=== Test Results ===
${docs.testResults}

Based on your sequential analysis, provide specific documentation updates.`;
    
  const finalResponse = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    temperature: 0.5,
    system: OPUS_PROMPT,
    messages: [{
      role: 'user', 
      content: finalPrompt
    }]
  });

  const analysisText = Array.isArray(finalResponse.content) ? 
    finalResponse.content.find(c => c.type === 'text')?.text || '' : 
    String(finalResponse.content);

  // Ensure test-results directory exists
  const testResultsDir = join(process.cwd(), 'test-results');
  if (!existsSync(testResultsDir)) {
    mkdirSync(testResultsDir, { recursive: true });
  }
  
  // Save sequential thinking process with metadata
  const sequentialPath = join(testResultsDir, `sequential-thinking-${new Date().toISOString()}.json`);
  const thinkingMetadata = {
    timestamp: new Date().toISOString(),
    totalThoughts: thoughts.length,
    thoughts,
    analysis: analysisText
  };
  writeFileSync(sequentialPath, JSON.stringify(thinkingMetadata, null, 2));
  console.log(`\n💾 Sequential thinking saved to: ${sequentialPath}`);

  return analysisText;
}

function readBridgeTestResults(): string {
  const testResultsDir = join(process.cwd(), 'test-results');
  
  if (!existsSync(testResultsDir)) {
    return 'No test results directory found.';
  }
  
  try {
    // Get all test run files
    const testRunFiles = readdirSync(testResultsDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.startsWith('test-run-') && dirent.name.endsWith('.json'))
      .map(dirent => dirent.name)
      .sort((a, b) => {
        // Extract timestamps and sort descending (newest first)
        const timestampA = parseInt(a.match(/test-run-(\d+)\.json/)?.[1] || '0');
        const timestampB = parseInt(b.match(/test-run-(\d+)\.json/)?.[1] || '0');
        return timestampB - timestampA;
      });
    
    if (testRunFiles.length === 0) {
      return 'No test run files found.';
    }
    
    // Use the most recent test run
    const latestTestRunFile = testRunFiles[0];
    const testRunPath = join(testResultsDir, latestTestRunFile);
    console.log(`📊 Using latest test run: ${latestTestRunFile}`);
    
    const testRunData = JSON.parse(readFileSync(testRunPath, 'utf-8'));
    
    if (!testRunData.results || testRunData.results.length === 0) {
      return 'No test results found in test run file.';
    }
    
    console.log(`📊 Found ${testRunData.results.length} test scenarios`);
    
    // Format test results for Opus analysis
    return formatTestResultsForAnalysis(testRunData.results);
    
  } catch (error) {
    console.error('Error reading test results:', error);
    return 'Error reading test results.';
  }
}

function formatTestResultsForAnalysis(testResults: any[]): string {
  let output = '=== Bridge Test Results ===\n\n';
  output += `Total scenarios tested: ${testResults.length}\n\n`;
  
  for (const result of testResults) {
    output += `## Scenario: ${result.scenarioName} (${result.scenario})\n`;
    output += `- Duration: ${result.duration ? result.duration.toFixed(1) + 's' : 'N/A'}\n`;
    output += `- Error: ${result.error || 'None'}\n`;
    output += `- Tool calls: ${result.toolCalls?.length || 0}\n\n`;
    
    // Include conversation if available
    if (result.messages && result.messages.length > 0) {
      output += '### Conversation:\n';
      let messageIndex = 0;
      
      for (const msg of result.messages) {
        messageIndex++;
        const turnNumber = Math.ceil(messageIndex / 2);
        
        if (msg.role === 'user') {
          output += `User: ${typeof msg.content === 'string' ? msg.content : '[complex content]'}\n`;
        } else if (msg.role === 'assistant') {
          // Check if there was a tool call on this turn
          const toolCall = result.toolCalls?.find((tc: any) => tc.turn === turnNumber);
          
          if (typeof msg.content === 'string') {
            output += `Assistant: ${msg.content}\n`;
          } else if (Array.isArray(msg.content)) {
            const text = msg.content
              .filter((c: any) => c.type === 'text')
              .map((c: any) => c.text)
              .join(' ');
            output += `Assistant: ${text || '[no text response]'}\n`;
          }
          
          // Add tool info if present
          if (toolCall) {
            const resultText = toolCall.result?.content?.[0]?.text?.split('\n')[0];
            output += `  [Tool: ${toolCall.toolName} → ${resultText || 'completed'}]\n`;
          }
        }
      }
      output += '\n';
    }
    
    // Include UX Analysis
    if (result.uxAnalysis) {
      output += '### UX Analysis:\n';
      output += result.uxAnalysis + '\n\n';
    }
    
    output += '---\n\n';
  }
  
  return output;
}

interface DocumentUpdate {
  file: string;
  section: string;
  content: string;
  summary: string;
}

function parseAndApplyUpdates(analysis: string): DocumentUpdate[] {
  const updates: DocumentUpdate[] = [];
  const updateRegex = /### UPDATE: (.+?)\.md\n#### Section: (.+?)\n#### Content:\n([\s\S]*?)(?=### UPDATE:|$)/g;
  
  let match;
  while ((match = updateRegex.exec(analysis)) !== null) {
    const [, fileName, section, content] = match;
    const file = `${fileName}.md`;
    
    // Apply the update
    const filePath = join(process.cwd(), file);
    
    // Create file if it doesn't exist (for EXPERIMENTS.md or LEARNINGS.md)
    if (!existsSync(filePath)) {
      if (fileName === 'EXPERIMENTS') {
        writeFileSync(filePath, createExperimentsFile());
      } else if (fileName === 'LEARNINGS') {
        writeFileSync(filePath, createLearningsFile());
      } else {
        console.log(`⚠️  File ${file} not found, skipping update`);
        continue;
      }
    }
    
    const currentContent = readFileSync(filePath, 'utf-8');
    let newContent = currentContent;
    
    // Apply update based on section type
    if (section.includes('Status Update')) {
      // For experiment status updates, check if experiment exists
      const expId = section.match(/\[(.+?)\]/)?.[1];
      if (expId) {
        const experimentExists = newContent.includes(`### ${expId}`);
        
        if (experimentExists) {
          // Update existing experiment status
          const statusRegex = new RegExp(`(### ${expId}[\\s\\S]*?)\\*\\*Status\\*\\*: .+`, 'm');
          if (statusRegex.test(newContent)) {
            newContent = newContent.replace(statusRegex, `$1**Status**: ${content.trim()}`);
          }
        } else {
          // Add new experiment
          // Find "Active Experiments" section or append at end
          const activeExperimentsRegex = /## Active Experiments\s*$/m;
          if (activeExperimentsRegex.test(newContent)) {
            newContent = newContent.replace(activeExperimentsRegex, (match) => {
              return match + '\n\n' + content.trim();
            });
          } else {
            newContent = currentContent.trimEnd() + '\n\n' + content.trim() + '\n';
          }
        }
      }
    } else {
      // For other updates, append to the file or section
      // Remove duplicate headers if they exist in the content
      const cleanContent = content.trim()
        .replace(new RegExp(`^#+\\s*${section}\\s*\\n`, 'im'), '');
      
      // Find the section or append at end
      const sectionRegex = new RegExp(`^#+\\s*${section}`, 'im');
      if (sectionRegex.test(newContent)) {
        // Insert after the section header
        newContent = newContent.replace(sectionRegex, (match) => {
          return match + '\n\n' + cleanContent;
        });
      } else {
        // Append to end of file
        newContent = currentContent.trimEnd() + '\n\n## ' + section + '\n\n' + cleanContent + '\n';
      }
    }
    
    writeFileSync(filePath, newContent);
    
    // Create summary
    const summary = content.trim().split('\n')[0].substring(0, 80) + 
                   (content.trim().split('\n')[0].length > 80 ? '...' : '');
    updates.push({ file, section, content: content.trim(), summary });
  }
  
  return updates;
}

function createVisionFile(): string {
  const content = `**VISION** → OPPORTUNITIES → EXPERIMENTS → LEARNINGS → VISION

# Project Vision

This document describes the north star for your project.

## How to use this document

1. **Describe the future state** - What does success look like?
2. **Define core principles** - What beliefs guide the project?
3. **List key features** - What capabilities will exist?
4. **Explain the why** - Why does this project matter?

The learning loop will analyze test results against this vision and suggest updates when reality differs from expectations.

## Template sections

### Core Philosophy
[What is the fundamental belief or approach?]

### Key Features
[What are the main capabilities?]

### Success Metrics
[How will you know when the vision is achieved?]

---

*The learning loop will help evolve this vision based on experimental evidence.*
`;
  writeFileSync(join(process.cwd(), 'VISION.md'), content);
  return content;
}

function createExperimentsFile(): string {
  const content = `VISION → OPPORTUNITIES → **EXPERIMENTS** → LEARNINGS → VISION

# Bridge Experiments

Active experiments testing our assumptions about Bridge.

## Experiment Template

### EXP-XXX: [Name]
**Status**: Pending | In Progress | Complete
**Hypothesis**: What we believe will happen
**Method**: How we'll test it
**Success Criteria**: What would validate/invalidate
**Results**: What actually happened
**Learning**: Link to LEARNINGS.md entry

---

## Active Experiments

`;
  writeFileSync(join(process.cwd(), 'EXPERIMENTS.md'), content);
  return content;
}

function createLearningsFile(): string {
  const content = `VISION → OPPORTUNITIES → EXPERIMENTS → **LEARNINGS** → VISION

# Bridge Learnings

Validated insights from our experiments that shape our understanding.

## Learning Template

### [Learning Name]
**Evidence**: Links to experiments/tests
**Confidence**: High | Medium | Low
**Implications**: How this changes our approach
**Related**: Links to other learnings

---

## Validated Learnings

`;
  writeFileSync(join(process.cwd(), 'LEARNINGS.md'), content);
  return content;
}

function createOpportunitiesFile(): string {
  const content = `VISION → **OPPORTUNITIES** → EXPERIMENTS → LEARNINGS → VISION

# Bridge Opportunities

Questions and assumptions to test about Bridge.

## Opportunity Template

### [Question]
**Question**: What do we want to learn?
- Sub-question: Specific aspect to explore
- Sub-question: Another aspect

**Impact**: 1-10 - Would the answer change our approach?
**Certainty**: 1-10 - How likely are we to get a useful answer?
**Urgency**: 1-10 - When does this opportunity expire?
**Score**: Impact × Certainty × Urgency

---

## Active Opportunities

`;
  writeFileSync(join(process.cwd(), 'OPPORTUNITIES.md'), content);
  return content;
}

function updateProgressionTracking(updateCount: number, timestamp: string) {
  const trackingPath = join(process.cwd(), 'test-results', 'progression-tracking.json');
  
  let tracking: any = {
    version: 1,
    iterations: 0,
    scenarios: {},
    learningLoops: []
  };
  
  if (existsSync(trackingPath)) {
    try {
      tracking = JSON.parse(readFileSync(trackingPath, 'utf-8'));
    } catch (e) {
      // If parsing fails, start fresh
    }
  }
  
  // Add this learning loop run
  tracking.learningLoops.push({
    timestamp,
    updateCount,
    testsAnalyzed: 3, // We always analyze 3 scenarios now
    analysisFile: `learning-loop-${timestamp}.md`
  });
  
  writeFileSync(trackingPath, JSON.stringify(tracking, null, 2));
}

function showTrendSummary() {
  const trackingPath = join(process.cwd(), 'test-results', 'progression-tracking.json');
  
  if (!existsSync(trackingPath)) {
    return;
  }
  
  try {
    const tracking = JSON.parse(readFileSync(trackingPath, 'utf-8'));
    const loops = tracking.learningLoops || [];
    
    if (loops.length > 1) {
      console.log('\n📈 Learning Loop Trend:');
      console.log(`   Total runs: ${loops.length}`);
      console.log(`   Total updates: ${loops.reduce((sum: number, l: any) => sum + l.updateCount, 0)}`);
      console.log(`   Average updates per run: ${(loops.reduce((sum: number, l: any) => sum + l.updateCount, 0) / loops.length).toFixed(1)}`);
    }
  } catch (e) {
    // Ignore errors in trend summary
  }
}

// Run the learning loop
runLearningLoop().catch(console.error);