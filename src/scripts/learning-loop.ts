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
import { join, basename } from 'path';
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

The goal is to see how Bridge changes the quality of human-AI interaction through empirical observation.

IMPORTANT: Generate updates in a structured format that can be directly applied to the documentation files.
Each update should include:
- The file to update (LEARNINGS.md, EXPERIMENTS.md, OPPORTUNITIES.md, or VISION.md)
- The specific section or location for the update
- The content to add (preserving existing content)
- Clear evidence trails for all learnings`;

// Sequential thinking prompt for deeper analysis
const SEQUENTIAL_THINKING_PROMPT = `You are using sequential thinking to analyze Bridge test results.

Sequential thinking approach:
- Break down complex patterns into steps
- Revise understanding as patterns emerge
- Generate and verify hypotheses
- Question your own assumptions
- Build toward actionable insights

You can:
- Adjust your total thought count as needed
- Revise previous thoughts when you discover something new
- Express uncertainty and explore alternatives
- Mark thoughts as revisions of earlier thinking

Focus on discovering genuine patterns in how Bridge affects conversations.`;

interface SequentialThought {
  thought: string;
  nextThoughtNeeded: boolean;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
}

async function runLearningLoop() {
  console.log('🔄 Starting Learning Loop Analysis...\n');
  
  // Check if tests were recently run
  const testResultsDir = join(process.cwd(), 'test-results');
  const scenariosDir = join(testResultsDir, 'scenarios');
  
  if (!existsSync(scenariosDir)) {
    console.log('🧪 No test results found. Running bridge tests...');
    console.log('This may take a few minutes...\n');
    
    // Build first
    console.log('🔨 Building MCP server...');
    execSync('npm run build', { stdio: 'inherit' });
    console.log('✅ Build completed\n');
    
    // Run tests
    execSync('npm run test:suite', { stdio: 'inherit' });
    console.log('✅ Tests completed');
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
    vision: readFileSync(join(process.cwd(), 'VISION.md'), 'utf-8'),
    opportunities: readFileSync(join(process.cwd(), 'OPPORTUNITIES.md'), 'utf-8'),
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
    testResults
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
  const testResultsDir = join(process.cwd(), 'test-results');
  if (!existsSync(testResultsDir)) {
    mkdirSync(testResultsDir, { recursive: true });
  }
  const outputPath = join(testResultsDir, `learning-loop-${timestamp}.md`);
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
}): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  let thoughts: SequentialThought[] = [];
  let currentThought = 1;
  let estimatedTotal = 8; // Initial estimate for analysis steps
  
  console.log('🧠 Opus is thinking step by step...\n');

  // Sequential thinking loop
  while (true) {
    const thoughtContext = thoughts.map((t, i) => 
      `Thought ${i + 1}${t.isRevision ? ` (revising thought ${t.revisesThought})` : ''}: ${t.thought}`
    ).join('\n\n');

    const thoughtPrompt = `Current test results to analyze:
${docs.testResults}

Your previous thoughts:
${thoughtContext || 'None yet - this is your first thought'}

Thought ${currentThought}/${estimatedTotal}

Analyze the test results step by step. Focus on:
1. What happened in each test scenario
2. Patterns in tool usage and conversation quality
3. Differences between with/without Bridge
4. Evidence of AI self-awareness in autonomous test
5. Surprises or unexpected behaviors

Provide your current thought and indicate if you need to continue thinking.
End with either "Continue thinking: yes" or "Continue thinking: no"`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-opus-4-20250514",
        max_tokens: 1000,
        temperature: 0.7,
        system: SEQUENTIAL_THINKING_PROMPT,
        messages: [{
          role: 'user',
          content: thoughtPrompt
        }]
      });

      const responseText = Array.isArray(response.content) ? 
        response.content.find(c => c.type === 'text')?.text || '' : 
        String(response.content);

      // Parse continue thinking decision
      const continueThinking = responseText.toLowerCase().includes('continue thinking: yes');
      
      const thought: SequentialThought = {
        thought: responseText.replace(/Continue thinking: (yes|no)/i, '').trim(),
        thoughtNumber: currentThought,
        totalThoughts: estimatedTotal,
        nextThoughtNeeded: continueThinking && currentThought < 12 // Safety limit
      };

      thoughts.push(thought);
      
      // Show abbreviated thought
      const abbreviatedThought = thought.thought.split('\n')[0].substring(0, 80);
      console.log(`  Step ${currentThought}: ${abbreviatedThought}...`);

      if (!thought.nextThoughtNeeded) {
        console.log('\n✅ Sequential analysis complete');
        break;
      }

      currentThought++;
      if (currentThought > estimatedTotal) {
        estimatedTotal = currentThought + 2; // Adjust estimate
      }
    } catch (error) {
      console.error('❌ Error in sequential thinking:', error);
      break;
    }
  }

  // Now generate final documentation updates based on sequential analysis
  console.log('\n📝 Generating documentation updates...');

  const thoughtSummary = thoughts.map((t, i) => 
    `Step ${i + 1}: ${t.thought}`
  ).join('\n\n');

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
    model: "claude-opus-4-20250514",
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

  // Save sequential thinking process
  const sequentialPath = join(process.cwd(), 'test-results', `sequential-thinking-${new Date().toISOString()}.json`);
  writeFileSync(sequentialPath, JSON.stringify({ thoughts, analysis: analysisText }, null, 2));

  return analysisText;
}

function readBridgeTestResults(): string {
  const testResultsDir = join(process.cwd(), 'test-results');
  const scenariosDir = join(testResultsDir, 'scenarios');
  
  if (!existsSync(testResultsDir) || !existsSync(scenariosDir)) {
    return 'No test results directory found.';
  }
  
  // Read all test results directly from JSON files
  const testResults: any[] = [];
  
  try {
    // Get all test result JSON files
    const testFiles = readdirSync(scenariosDir, { withFileTypes: true })
      .filter(dirent => dirent.isFile() && dirent.name.endsWith('.json'))
      .map(dirent => dirent.name);
    
    console.log(`📊 Found ${testFiles.length} test result files`);
    
    // Group by scenario and get the latest for each
    const latestByScenario = new Map<string, { file: string; timestamp: number }>();
    
    for (const file of testFiles) {
      // Extract scenario name and timestamp from filename (e.g., "observe-1752945275187.json")
      const match = file.match(/^(.+?)-(\d+)\.json$/);
      if (match) {
        const [, scenario, timestampStr] = match;
        const timestamp = parseInt(timestampStr);
        
        const existing = latestByScenario.get(scenario);
        if (!existing || timestamp > existing.timestamp) {
          latestByScenario.set(scenario, { file, timestamp });
        }
      }
    }
    
    console.log(`📊 Processing ${latestByScenario.size} unique scenarios`);
    
    // Read the latest test for each scenario
    for (const [scenario, { file }] of latestByScenario) {
      const filePath = join(scenariosDir, file);
      
      try {
        const testData = JSON.parse(readFileSync(filePath, 'utf-8'));
        testResults.push({
          scenario: testData.scenario,
          scenarioName: testData.scenarioName,
          startTime: testData.startTime,
          endTime: testData.endTime,
          duration: testData.duration,
          messages: testData.messages,
          toolCalls: testData.toolCalls,
          uxAnalysis: testData.uxAnalysis,
          error: testData.error
        });
        console.log(`  ✓ ${scenario}: ${testData.scenarioName}`);
      } catch (error) {
        console.log(`  ✗ ${scenario}: Failed to parse JSON`);
      }
    }
    
    if (testResults.length === 0) {
      return 'No test results found in scenarios directory.';
    }
    
    // Format test results for Opus analysis
    return formatTestResultsForAnalysis(testResults);
    
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
      for (const msg of result.messages) {
        if (msg.role === 'user') {
          output += `User: ${msg.content}\n`;
        } else if (msg.role === 'assistant') {
          if (typeof msg.content === 'string') {
            output += `Assistant: ${msg.content}\n`;
          } else if (Array.isArray(msg.content)) {
            const textContent = msg.content.find((c: any) => c.type === 'text');
            if (textContent) {
              output += `Assistant: ${textContent.text}\n`;
            }
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
    
    // Include tool calls detail
    if (result.toolCalls && result.toolCalls.length > 0) {
      output += '### Tool Calls:\n';
      for (const tool of result.toolCalls) {
        output += `- Turn ${tool.turn}: ${tool.toolName}${tool.error ? ' (failed)' : ''}\n`;
      }
      output += '\n';
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
      // For experiment status updates, replace the status line
      const expId = section.match(/\[(.+?)\]/)?.[1];
      if (expId) {
        const statusRegex = new RegExp(`(### ${expId}[\\s\\S]*?)\\*\\*Status\\*\\*: .+`, 'm');
        if (statusRegex.test(newContent)) {
          newContent = newContent.replace(statusRegex, `$1**Status**: ${content.trim()}`);
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

function updateProgressionTracking(updateCount: number, timestamp: string) {
  const trackingPath = join(process.cwd(), 'test-results', 'progression-tracking.json');
  
  let tracking = {
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