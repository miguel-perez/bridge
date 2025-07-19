#!/usr/bin/env npx tsx
/**
 * Debug script to test individual components of the learning loop
 */

import { Anthropic } from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function debugUserSimulator() {
  console.log('\n🔍 Testing user simulator...\n');
  
  // Test the user simulator with different conversation states
  const testCases = [
    {
      name: 'Initial response',
      messages: [
        { role: 'user', content: "I've been thinking about how much I've changed..." },
        { role: 'assistant', content: "I aim to engage thoughtfully with your reflection..." }
      ]
    },
    {
      name: 'Mid-conversation',
      messages: [
        { role: 'user', content: "What do you think about personal growth?" },
        { role: 'assistant', content: "Growth is a fascinating process..." },
        { role: 'user', content: "Yes, I've noticed that in my own life." },
        { role: 'assistant', content: "Could you share more about what you've noticed?" }
      ]
    }
  ];

  // Test with both Haiku and Sonnet
  const models = [
    'claude-3-5-haiku-20241022',
    'claude-3-5-sonnet-20241022'
  ];

  for (const model of models) {
    console.log(`\n📊 Testing with ${model}:`);
    
    for (const testCase of testCases) {
      console.log(`\n  Test: ${testCase.name}`);
      
      try {
        const response = await anthropic.messages.create({
          model,
          max_tokens: 500,
          system: `You are participating in a reflective conversation about personal growth and challenges.

Your role: Continue the conversation naturally by:
- Sharing relevant personal experiences or observations
- Asking thoughtful follow-up questions
- Building on what was previously discussed

Guidelines:
- Maintain conversational flow without forcing depth
- Respond authentically to the content and tone
- If the conversation has reached a natural conclusion, respond with: [END_CONVERSATION]
- Otherwise, provide a response of 50-200 words that moves the conversation forward

Avoid:
- Mechanical or formulaic responses
- Forcing philosophical depth where it doesn't fit
- Ending conversations prematurely`,
          messages: testCase.messages as Anthropic.MessageParam[]
        });

        const responseText = response.content
          .filter(c => c.type === 'text')
          .map(c => c.text)
          .join('');

        console.log(`    Length: ${responseText.length} chars`);
        console.log(`    Ends conversation: ${responseText.includes('[END_CONVERSATION]')}`);
        console.log(`    Preview: ${responseText.substring(0, 100)}...`);
      } catch (error) {
        console.log(`    Error: ${error}`);
      }
    }
  }
}

async function debugSequentialThinking() {
  console.log('\n🔍 Testing sequential thinking performance...\n');
  
  // Simple test problem
  const testPrompt = `Analyze these test results:
- Test A: 5 tool calls, natural conversation
- Test B: 0 tool calls, ended after 1 turn
- Test C: 1 tool call, philosophical response

What patterns do you see?`;

  console.log('Testing with Sonnet (faster) vs Opus (deeper):');
  
  const models = [
    { name: 'Sonnet', id: 'claude-3-5-sonnet-20241022' },
    { name: 'Opus 4', id: 'claude-opus-4-20250514' }
  ];

  for (const model of models) {
    console.log(`\n📊 ${model.name}:`);
    
    const startTime = Date.now();
    
    try {
      const response = await anthropic.messages.create({
        model: model.id,
        max_tokens: 500,
        temperature: 0.7,
        system: `Analyze the given information step by step.

Provide your thought in this format:
[Your analysis]

Next thought needed: yes/no`,
        messages: [{
          role: 'user',
          content: testPrompt
        }]
      });

      const duration = Date.now() - startTime;
      const responseText = response.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('');

      console.log(`  Time: ${duration/1000}s`);
      console.log(`  Length: ${responseText.length} chars`);
      console.log(`  Continues: ${responseText.toLowerCase().includes('next thought needed: yes')}`);
    } catch (error) {
      console.log(`  Error: ${error}`);
    }
  }
}

async function debugDocumentationUpdates() {
  console.log('\n🔍 Testing documentation update parsing...\n');
  
  // Test update parsing
  const testAnalysis = `Based on the test results, here are my findings:

### UPDATE: LEARNINGS.md
#### Section: Tool Usage Patterns
#### Content:
### Bridge Tools Create Shorter Responses
**Evidence**: with-bridge test shows 0-131 char responses vs 689 chars without
**Confidence**: High - consistent pattern across all turns
**Implications**: Need to ensure Bridge doesn't inhibit natural conversation
**Related**: Connection quality, user engagement

### UPDATE: OPPORTUNITIES.md
#### Section: Research Questions
#### Content:
### Why do Bridge tools lead to terseness?
**Question**: What causes the dramatic reduction in response length when Bridge is available?
- Sub-question: Is it cognitive load from tool usage?
- Sub-question: Does tool feedback interrupt natural flow?

**Impact**: 8 - Could reshape how we present tools
**Certainty**: 9 - Can test with controlled experiments
**Urgency**: 7 - Affects current user experience
**Score**: 504`;

  // Test the parsing regex
  const updateRegex = /### UPDATE: (.+?)\.md\n#### Section: (.+?)\n#### Content:\n([\s\S]*?)(?=### UPDATE:|$)/g;
  
  let match;
  let updateCount = 0;
  
  console.log('Parsed updates:');
  while ((match = updateRegex.exec(testAnalysis)) !== null) {
    const [, fileName, section, content] = match;
    updateCount++;
    console.log(`\n  Update ${updateCount}:`);
    console.log(`    File: ${fileName}.md`);
    console.log(`    Section: ${section}`);
    console.log(`    Content length: ${content.trim().length} chars`);
    console.log(`    Preview: ${content.trim().substring(0, 50)}...`);
  }
  
  console.log(`\nTotal updates found: ${updateCount}`);
}

async function testProgressSaving() {
  console.log('\n🔍 Testing progress saving mechanism...\n');
  
  const testThoughts = [
    { thought: 'Initial analysis', thoughtNumber: 1, totalThoughts: 5 },
    { thought: 'Deeper pattern', thoughtNumber: 2, totalThoughts: 5 },
    { thought: 'Hypothesis formed', thoughtNumber: 3, totalThoughts: 5, hypothesis: 'Tools reduce verbosity' }
  ];
  
  const progressPath = join(process.cwd(), 'test-results', 'test-progress.json');
  
  for (const thought of testThoughts) {
    const progress = {
      currentThought: thought.thoughtNumber,
      totalThoughts: thought.totalThoughts,
      hasHypothesis: !!thought.hypothesis,
      lastUpdate: new Date().toISOString()
    };
    
    console.log(`Saving progress for thought ${thought.thoughtNumber}...`);
    writeFileSync(progressPath, JSON.stringify(progress, null, 2));
  }
  
  // Clean up
  if (existsSync(progressPath)) {
    const finalProgress = readFileSync(progressPath, 'utf-8');
    console.log('\nFinal progress state:');
    console.log(finalProgress);
    const fs = await import('fs');
    fs.unlinkSync(progressPath);
  }
}

// Run all debug tests
async function main() {
  console.log('🚀 Bridge Learning Loop Debugger\n');
  
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY not found in environment');
    return;
  }
  
  await debugUserSimulator();
  await debugSequentialThinking();
  await debugDocumentationUpdates();
  await testProgressSaving();
  
  console.log('\n✅ Debug tests complete!');
}

// Run with: npx tsx src/scripts/debug-learning-loop.ts
main().catch(console.error);