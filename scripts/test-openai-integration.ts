#!/usr/bin/env tsx
import { createLLMProvider } from '../src/llm-provider.js';
import { getConfig } from '../src/config.js';
import { AutoProcessor } from '../src/auto-processing.js';
import { statusMonitor } from '../src/status.js';
import { setStorageConfig } from '../src/storage.js';
import { setEmbeddingsConfig } from '../src/embeddings.js';
import path from 'path';
import fs from 'fs';
// Import debug log getters
// import { getPromptDebugLogs } from '../src/prompts.js';
// import { getAutoProcessingDebugLogs } from '../src/auto-processing.js';
// import { getSearchDebugLogs } from '../src/search.js';

// Color helpers for console output
const color = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const LOG_FILE = 'test-openai-integration.log';
function appendLog(msg: string) {
  fs.appendFileSync(LOG_FILE, msg + '\n');
}

function section(title: string) {
  const msg = `\n${color.cyan}${color.bold}=== ${title} ===${color.reset}`;
  console.log(msg);
  appendLog(title);
}
function success(msg: string) {
  console.log(`${color.green}✔ ${msg}${color.reset}`);
  appendLog('✔ ' + msg);
}
function warn(msg: string) {
  console.log(`${color.yellow}⚠️  ${msg}${color.reset}`);
  appendLog('⚠️  ' + msg);
}
function error(msg: string) {
  console.log(`${color.red}✖ ${msg}${color.reset}`);
  appendLog('✖ ' + msg);
}
function info(msg: string) {
  console.log(`${color.blue}${msg}${color.reset}`);
  appendLog(msg);
}

const DATA_FILE_PATH = process.env.BRIDGE_FILE_PATH
  ? (path.isAbsolute(process.env.BRIDGE_FILE_PATH)
      ? process.env.BRIDGE_FILE_PATH
      : path.resolve(process.cwd(), process.env.BRIDGE_FILE_PATH))
  : './data/development/sample-bridge.json';
setStorageConfig({ dataFile: DATA_FILE_PATH });
setEmbeddingsConfig({ dataFile: DATA_FILE_PATH });

class LoggingAutoProcessor extends AutoProcessor {
  constructor() {
    super();
    // Override the llmProvider with a logging wrapper
    this.llmProvider = createLLMProvider();
    const realComplete = this.llmProvider.complete.bind(this.llmProvider);
    this.llmProvider.complete = async (...args) => {
      const prompt = args[0];
      // Show the prompt template (no truncation)
      info('📝 LLM PROMPT TEMPLATE:');
      if (typeof prompt === 'string') {
        console.log(prompt);
        appendLog('PROMPT:\n' + prompt);
      } else {
        console.log('[Non-string prompt]', prompt);
        appendLog('PROMPT: [Non-string prompt]');
      }
      // Show variables/arguments if present
      if (args.length > 1 && args[1] && typeof args[1] === 'object') {
        info('📝 LLM PROMPT VARIABLES:');
        console.dir(args[1], { depth: 3, colors: true });
        appendLog('PROMPT VARIABLES:\n' + JSON.stringify(args[1], null, 2));
      }
      const response = await realComplete(...args);
      info('🤖 LLM OUTPUT:');
      console.log(response);
      appendLog('RESPONSE:\n' + response);
      return response;
    };
  }
}

async function testOpenAIIntegration() {
  section('🧪 Testing OpenAI Integration');

  // Test 1: Check configuration
  section('1. Checking configuration');
  const config = getConfig();
  success(`OpenAI API Key: ${config.openai.apiKey ? 'Set' : color.red + 'Not set' + color.reset}`);
  info(`Model: ${config.openai.model}`);
  success(`Auto-framing: ${config.openai.autoFrame.enabled ? 'Enabled' : color.red + 'Disabled' + color.reset}`);
  success(`Auto-weaving: ${config.openai.autoWeave.enabled ? 'Enabled' : color.red + 'Disabled' + color.reset}`);

  // Test 2: Check LLM provider
  section('2. Testing LLM provider');
  try {
    const llmProvider = createLLMProvider();
    if (llmProvider.isAvailable()) {
      success('Provider available');
      info('Testing completion...');
      const response = await llmProvider.complete('Say "Hello, OpenAI integration works!"');
      success(`Response: ${response.substring(0, 100)}...`);
    } else {
      error('Provider not available');
    }
  } catch (err) {
    error(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  // Test 3: Test auto-processor
  section('3. Testing auto-processor');
  try {
    new AutoProcessor();
    success('Auto-processor created successfully');
  } catch (err) {
    error(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  // Test 4: Test status monitor
  section('4. Testing status monitor');
  try {
    const report = await statusMonitor.generateStatusReport();
    success('Status report generated successfully');
    info(`Unframed sources: ${report.unframed_sources_count}`);
    info(`Unreviewed moments: ${report.unreviewed_moments_count}`);
    info(`Unreviewed scenes: ${report.unreviewed_scenes_count}`);
    info(`Unweaved moments: ${report.unweaved_moments_count}`);
  } catch (err) {
    error(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  // Test 5: Test auto-framing pipeline with real sources from data/bridge.json
  section('5. Testing auto-framing pipeline with real sources');
  try {
    const { getSources, getMoments } = await import('../src/storage.js');
    const sources = await getSources();
    const moments = await getMoments();
    const framedSourceIds = new Set(moments.flatMap(m => m.sources.map(s => s.sourceId)));
    const unframed = sources.filter(s => !framedSourceIds.has(s.id));
    const testBatch = unframed.slice(0, 3).map(s => s.id);

    if (testBatch.length === 0) {
      warn('No unframed sources available for auto-framing test.');
    } else {
      info('Using the following unframed sources for auto-framing:');
      testBatch.forEach(id => {
        const src = sources.find(s => s.id === id);
        if (src) {
          info(`  • Source ID: ${color.bold}${src.id}${color.reset}`);
          console.log(`    Content: ${src.content.replace(/\n/g, '\n    ')}`);
        }
      });
      // Print context block for each source
      const { createBatchFramePrompt } = await import('../src/prompts.js');
      const batchSources = testBatch.map(id => sources.find(s => s.id === id)).filter((s): s is typeof sources[0] => Boolean(s));
      const contextPrompt = await createBatchFramePrompt(batchSources, sources);
      info('📝 CONTEXT BLOCK FOR BATCH PROMPT:');
      const contextSection = contextPrompt.split('ADDITIONAL CONTEXT FOR EACH SOURCE:')[1]?.split('Return an array of frames')[0];
      if (contextSection) {
        console.log(contextSection.trim());
        appendLog('CONTEXT BLOCK:\n' + contextSection.trim());
      }
      const autoProcessor = new LoggingAutoProcessor();
      const results = await autoProcessor.autoFrameSources({ sourceIds: testBatch });
      results.forEach((result, idx) => {
        if (result.success && result.created) {
          success(`[${idx}] Created moment: ${result.created.emoji} "${result.created.summary}" (ID: ${result.created.id})`);
          info('Full moment:');
          console.dir(result.created, { depth: 4, colors: true });
          if (result.warning) warn(result.warning);
        } else {
          error(`[${idx}] Error: ${result.error}`);
          if (result.warning) warn(result.warning);
        }
      });
    }
  } catch (err) {
    error(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
}

testOpenAIIntegration();
