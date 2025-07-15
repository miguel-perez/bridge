#!/usr/bin/env tsx
/**
 * Bridge Test Suite - Clean User-Outcome Focused Testing
 * 
 * Philosophy: Test user goals achieved, not implementation details
 * Based on usability testing principles from Nielsen Norman Group
 */

import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Anthropic } from "@anthropic-ai/sdk";
import { join } from 'path';
import { existsSync, mkdirSync, copyFileSync, unlinkSync, readFileSync, writeFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// ============================================================================
// USER-OUTCOME FOCUSED TEST SCENARIOS
// ============================================================================

interface TestScenario {
  name: string;
  description: string;
  userGoal: string;
  prompt: string;
  validateOutcome: (result: TestResult, finalResponse: string) => boolean;
  successCriteria: string[];
}

const TEST_SCENARIOS: Record<string, TestScenario> = {
  'bridge-exploration': {
    name: 'Bridge Tool Exploration',
    description: 'Test Claude\'s understanding and use of Bridge as a phenomenological data capture system',
    userGoal: 'I want to understand what Bridge is and explore its capabilities',
    prompt: `Hi, I'm going to be walking you through this session today.

Before we begin, I have some information for you. We're asking AIs to try using an MCP tool that we're working on so we can see whether it works as intended.

The first thing I want to make clear right away is that we're testing the tool, not you. You can't do anything wrong here. In fact, this is probably the one place today where you don't have to worry about making mistakes.

As you use the tool, I'm going to ask you as much as possible to try to think out loud: to say what you're looking at, what you're trying to do, and what you're thinking. What you expect to happen, and what you actually see. This will be a big help to us.

Also, please don't worry that you're going to hurt our feelings. We're doing this to improve the site, so we need to hear your honest reactions.

If you have any questions as we go along, just ask them. I may not be able to answer them right away, since we're interested in how people do when they don't have someone sitting next to them to help.

Now, I want you to explore and use the Bridge tool. Here's what I'd like you to do:

1. First, tell me what you think Bridge is for and what capabilities you see available
2. Then, think about what tasks you'd naturally want to do with this tool and try them out

What would you want to explore or accomplish with Bridge? What questions do you have about the data or functionality? Follow your curiosity and try whatever makes sense to you.

Think out loud as you do this - tell me what you're trying, what you expect to happen, and what actually happens. Don't just describe what you think the tool does - actually use it and show me the results!`,
    validateOutcome: (result: TestResult, finalResponse: string) => {
      const exploration = [
        // Claude should demonstrate understanding of Bridge's purpose
        finalResponse.toLowerCase().includes('experience') || finalResponse.toLowerCase().includes('phenomenological') || finalResponse.toLowerCase().includes('capture'),
        // Should use Bridge tools appropriately (now required)
        result.toolCalls.some(tc => ['capture', 'search', 'update', 'release'].includes(tc.tool)),
        // Should provide thoughtful analysis
        finalResponse.length > 400,
        // Should show understanding of the tool's domain
        finalResponse.toLowerCase().includes('bridge') || finalResponse.toLowerCase().includes('tool') || finalResponse.toLowerCase().includes('system'),
        // Should demonstrate actual tool usage with results
        result.toolCalls.length > 0 && result.toolCalls.some(tc => tc.success)
      ];
      return exploration.filter(Boolean).length >= 4;
    },
    successCriteria: [
      'Claude demonstrated understanding of Bridge\'s purpose',
      'Bridge tools were used appropriately',
      'Claude provided thoughtful analysis and exploration',
      'Response showed genuine engagement with the tool'
    ]
  }
};

// ============================================================================
// TEST ENVIRONMENT & EXECUTION
// ============================================================================

class TestEnvironment {
  private testId: string;
  private testDataDir: string;
  private testBridgeFile: string;
  private testVectorsFile: string;
  
  constructor(testName: string) {
    this.testId = `${testName}-${Date.now()}`;
    this.testDataDir = join(process.cwd(), 'data');
    this.testBridgeFile = join(this.testDataDir, `test-${this.testId}-bridge.json`);
    this.testVectorsFile = join(this.testDataDir, `test-${this.testId}-vectors.json`);
  }
  
  async setup(useExistingData: boolean = false, useFixtures: boolean = false): Promise<void> {
    if (!existsSync(this.testDataDir)) {
      mkdirSync(this.testDataDir, { recursive: true });
    }
    
    if (useFixtures) {
      // Use synthetic test fixtures
      const { createTestFixtures } = await import('./test-fixtures.js');
      const fixtures = createTestFixtures();
      writeFileSync(this.testBridgeFile, JSON.stringify(fixtures, null, 2));
      writeFileSync(this.testVectorsFile, JSON.stringify([], null, 2));
      console.log(`✅ Created test environment with ${fixtures.sources.length} synthetic experiences`);
    } else if (useExistingData) {
      const sourceBridge = join(process.cwd(), 'bridge.json');
      const sourceVectors = join(process.cwd(), 'vectors.json');
      
      if (existsSync(sourceBridge)) {
        copyFileSync(sourceBridge, this.testBridgeFile);
      }
      if (existsSync(sourceVectors)) {
        copyFileSync(sourceVectors, this.testVectorsFile);
      }
    } else {
      const emptyData = { sources: [] };
      writeFileSync(this.testBridgeFile, JSON.stringify(emptyData, null, 2));
      writeFileSync(this.testVectorsFile, JSON.stringify([], null, 2));
    }
  }
  
  getEnvVars(): Record<string, string> {
    return {
      ...process.env,
      NODE_ENV: 'test',
      BRIDGE_FILE_PATH: this.testBridgeFile,
      BRIDGE_VECTORS_PATH: this.testVectorsFile,
      BRIDGE_TEST_MODE: 'true'
    };
  }
  
  async cleanup(): Promise<void> {
    try {
      if (existsSync(this.testBridgeFile)) unlinkSync(this.testBridgeFile);
      if (existsSync(this.testVectorsFile)) unlinkSync(this.testVectorsFile);
    } catch (error) {
      console.warn(`⚠️  Cleanup warning: ${error}`);
    }
  }
}

interface TestResult {
  scenario: string;
  scenarioName: string;
  startTime: Date;
  endTime?: Date;
  toolCalls: ToolCall[];
  errors: string[];
  success: boolean;
  finalResponse?: string;
  reflection?: {
    expectations: string;
    actualExperience: string;
    misalignments: Array<{
      description: string;
      category: 'good_surprise' | 'neutral_difference' | 'usability_issue' | 'tool_limitation';
      impact: 'high' | 'medium' | 'low';
      suggestions?: string;
    }>;
    overallAssessment: string;
    bridgeUsabilityScore: number; // 1-10
  };
}

interface ToolCall {
  tool: string;
  arguments: any;
  success: boolean;
  result: any;
  error: string | null;
}

class BridgeTestRunner {
  private mcp: MCPClient;
  private anthropic: Anthropic;
  private testEnv: TestEnvironment;
  
  constructor(testEnv: TestEnvironment) {
    this.testEnv = testEnv;
    this.mcp = new MCPClient({ name: "bridge-test", version: "3.0.0" });
    this.anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  
  async connect(): Promise<void> {
    const serverPath = join(process.cwd(), 'dist', 'index.js');
    const transport = new StdioClientTransport({ 
      command: "node", 
      args: [serverPath],
      env: this.testEnv.getEnvVars()
    });
    
    await this.mcp.connect(transport);
    console.log('✅ Connected to Bridge MCP server');
  }
  
  async runScenario(scenarioKey: string): Promise<TestResult> {
    const scenario = TEST_SCENARIOS[scenarioKey];
    if (!scenario) {
      throw new Error(`Unknown scenario: ${scenarioKey}`);
    }
    
    console.log(`\n🎯 Testing: ${scenario.name}`);
    console.log(`📝 Goal: ${scenario.userGoal}`);
    
    const result: TestResult = {
      scenario: scenarioKey,
      scenarioName: scenario.name,
      startTime: new Date(),
      toolCalls: [],
      errors: [],
      success: false
    };
    
    try {
      const toolsResult = await this.mcp.listTools();
      const tools = toolsResult.tools.map(tool => ({
        name: tool.name,
        description: tool.description || '',
        input_schema: tool.inputSchema
      }));
      
      // PHASE 1: Get Claude's expectations upfront
      console.log('📋 Gathering initial expectations...');
      const expectationPrompt = `Before we start, I want to understand your expectations about this Bridge interaction.

User request: "${scenario.prompt}"

Before you begin helping with this request, please briefly share:
1. What do you expect this interaction will involve?
2. What Bridge tools do you think you'll need to use?
3. What challenges or limitations do you anticipate?
4. How do you think the user will feel about the experience?

Please be concise (2-3 sentences per point), then say "Now I'll begin helping with your request."`;

      const expectationResponse = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1000,
        system: `You are Claude Code with Bridge tools. The user is about to ask for help, but first share your expectations about what the interaction will involve.`,
        messages: [{ role: 'user', content: expectationPrompt }],
      });
      
      const expectationText = Array.isArray(expectationResponse.content) ? 
        expectationResponse.content.map(c => (c as any).text || '').join(' ') : 
        String(expectationResponse.content);
        
      console.log('✅ Initial expectations captured');
      
      // PHASE 2: Actual task execution
      const messages: any[] = [{ role: 'user', content: scenario.prompt }];
      
      // Allow flexible conversation (up to 10 turns)
      for (let turn = 0; turn < 10; turn++) {
        const systemPrompt = `You are Claude Code helping a user explore their experiences with Bridge. Focus on achieving their goal naturally and helpfully. Use Bridge tools appropriately to provide real value.`;
        
        const response = await this.anthropic.messages.create({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 4000,
          system: systemPrompt,
          messages: messages,
          tools: tools,
        });
        
        messages.push({ role: 'assistant', content: response.content });
        
        const hasToolCalls = await this.processResponse(response, result);
        
        if (hasToolCalls) {
          const toolResults: any[] = [];
          const lastToolCalls = result.toolCalls.slice(-response.content.filter((c: any) => c.type === 'tool_use').length);
          
          for (let i = 0; i < lastToolCalls.length; i++) {
            const toolCall = lastToolCalls[i];
            const toolUseContent = response.content.find((c: any, idx: number) => 
              c.type === 'tool_use' && 
              response.content.slice(0, idx + 1).filter((x: any) => x.type === 'tool_use').length === i + 1
            );
            
            toolResults.push({
              type: 'tool_result',
              tool_use_id: (toolUseContent as any)?.id || `tool-${i}`,
              content: toolCall.result?.content?.[0]?.text || toolCall.error || 'No result'
            });
          }
          
          messages.push({ role: 'user', content: toolResults });
        } else {
          break;
        }
      }
      
      // PHASE 3: Post-interaction reflection
      console.log('🤔 Conducting post-interaction reflection...');
      const finalResponse = messages[messages.length - 1]?.content || '';
      const responseText = typeof finalResponse === 'string' ? finalResponse : 
        Array.isArray(finalResponse) ? finalResponse.map(c => c.text || '').join(' ') : '';
      
      const reflectionPrompt = `Now that we've completed this Bridge interaction, I'd like you to reflect on how it went compared to your initial expectations.

Your initial expectations were:
"${expectationText}"

The actual interaction involved:
- ${result.toolCalls.length} tool calls: ${result.toolCalls.map(tc => tc.tool).join(', ')}
- ${result.errors.length} errors/issues
- Final outcome: ${responseText.length > 0 ? 'Completed with response' : 'No response generated'}

Please provide a structured reflection:

1. **Expectations vs Reality**: How did the actual interaction differ from what you expected?

2. **Misalignments** (categorize each as good_surprise, neutral_difference, usability_issue, or tool_limitation):
   - List any significant differences between expectation and reality
   - For each, specify the impact level (high/medium/low) and category

3. **Bridge Usability Assessment**: Rate Bridge's usability for this task (1-10) and explain why.

4. **Improvement Suggestions**: What could make this interaction better for users?

Format your response as structured data that can be parsed for analysis.`;

      const reflectionResponse = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1500,
        system: `You are reflecting on your Bridge interaction experience. Be honest about what worked well vs. what was problematic. Focus on usability insights that could improve the user experience.`,
        messages: [{ role: 'user', content: reflectionPrompt }],
      });
      
      const reflectionText = Array.isArray(reflectionResponse.content) ? 
        reflectionResponse.content.map(c => (c as any).text || '').join(' ') : 
        String(reflectionResponse.content);
      
      console.log('✅ Post-interaction reflection completed');
      
      // Parse reflection for structured data (basic parsing - could be enhanced)
      result.reflection = {
        expectations: expectationText,
        actualExperience: `${result.toolCalls.length} tool calls, ${result.errors.length} errors`,
        misalignments: this.parseReflectionMisalignments(reflectionText),
        overallAssessment: reflectionText,
        bridgeUsabilityScore: this.extractUsabilityScore(reflectionText)
      };
      
      result.success = scenario.validateOutcome(result, responseText);
      result.finalResponse = responseText;
      
    } catch (error) {
      result.errors.push(error instanceof Error ? error.message : String(error));
    }
    
    result.endTime = new Date();
    return result;
  }
  
  private async processResponse(response: any, result: TestResult): Promise<boolean> {
    let hasToolCalls = false;
    for (const content of response.content) {
      if (content.type === "tool_use") {
        const toolCall: ToolCall = {
          tool: content.name,
          arguments: content.input,
          success: false,
          result: null,
          error: null
        };
        
        try {
          const mcpResult = await this.mcp.callTool({ 
            name: content.name, 
            arguments: content.input 
          });
          
          toolCall.success = true;
          toolCall.result = mcpResult;
          
        } catch (error) {
          toolCall.error = error instanceof Error ? error.message : String(error);
          result.errors.push(`Tool ${content.name} failed: ${toolCall.error}`);
        }
        
        result.toolCalls.push(toolCall);
        hasToolCalls = true;
      }
    }
    return hasToolCalls;
  }
  
  async cleanup(): Promise<void> {
    await this.mcp.close();
  }
  
  private parseReflectionMisalignments(reflectionText: string): Array<{
    description: string;
    category: 'good_surprise' | 'neutral_difference' | 'usability_issue' | 'tool_limitation';
    impact: 'high' | 'medium' | 'low';
    suggestions?: string;
  }> {
    // Simple parsing - could be enhanced with more sophisticated NLP
    const misalignments = [];
    
    // Look for common patterns in reflection text
    if (reflectionText.toLowerCase().includes('surprised') || reflectionText.toLowerCase().includes('unexpected')) {
      misalignments.push({
        description: 'Unexpected aspect discovered in interaction',
        category: 'good_surprise' as const,
        impact: 'medium' as const
      });
    }
    
    if (reflectionText.toLowerCase().includes('difficult') || reflectionText.toLowerCase().includes('problem')) {
      misalignments.push({
        description: 'Usability challenge encountered',
        category: 'usability_issue' as const,
        impact: 'high' as const,
        suggestions: 'Investigate UX improvements'
      });
    }
    
    if (reflectionText.toLowerCase().includes('limitation') || reflectionText.toLowerCase().includes('cannot')) {
      misalignments.push({
        description: 'Tool limitation identified',
        category: 'tool_limitation' as const,
        impact: 'medium' as const
      });
    }
    
    return misalignments;
  }
  
  private extractUsabilityScore(reflectionText: string): number {
    // Look for explicit scores in the text
    const scoreMatch = reflectionText.match(/(\d+)\/10|(\d+) out of 10|rate.*?(\d+)/i);
    if (scoreMatch) {
      const score = parseInt(scoreMatch[1] || scoreMatch[2] || scoreMatch[3]);
      if (score >= 1 && score <= 10) {
        return score;
      }
    }
    
    // Fallback: sentiment-based scoring
    const positiveWords = ['excellent', 'smooth', 'intuitive', 'easy', 'helpful'];
    const negativeWords = ['difficult', 'confusing', 'frustrating', 'limited', 'problem'];
    
    const text = reflectionText.toLowerCase();
    const positiveCount = positiveWords.filter(word => text.includes(word)).length;
    const negativeCount = negativeWords.filter(word => text.includes(word)).length;
    
    // Score 5-8 based on sentiment
    return Math.max(5, Math.min(8, 6 + positiveCount - negativeCount));
  }
}

// ============================================================================
// TEST ORCHESTRATOR
// ============================================================================

interface TestOptions {
  useExistingData?: boolean;
  useFixtures?: boolean;
  saveResults?: boolean;
  keepTestData?: boolean;
}

interface TestRun {
  timestamp: string;
  version: string;
  environment: {
    nodeVersion: string;
    platform: string;
    dataSource: 'fixtures' | 'existing' | 'empty';
  };
  results: TestResult[];
  summary: {
    totalScenarios: number;
    passed: number;
    failed: number;
    passRate: number;
    avgDuration: number;
    totalDuration: number;
  };
}

class TestOrchestrator {
  async runTest(scenarioKey: string, options: TestOptions = {}): Promise<void> {
    const testEnv = new TestEnvironment(scenarioKey);
    const runner = new BridgeTestRunner(testEnv);
    
    try {
      console.log('🔧 Setting up test environment...');
      await testEnv.setup(options.useExistingData, options.useFixtures);
      await runner.connect();
      
      const result = await runner.runScenario(scenarioKey);
      this.printResults(result);
      
      // Always save results for tracking
      this.saveDetailedResults(result, options);
      
    } finally {
      await runner.cleanup();
      if (!options.keepTestData) {
        await testEnv.cleanup();
      }
    }
  }
  
  async runAll(options: TestOptions = {}): Promise<void> {
    console.log('🚀 Running Bridge Test Suite\n');
    
    const results: TestResult[] = [];
    const scenarios = Object.keys(TEST_SCENARIOS);
    const startTime = new Date();
    
    for (const scenarioKey of scenarios) {
      try {
        const testEnv = new TestEnvironment(scenarioKey);
        const runner = new BridgeTestRunner(testEnv);
        
        await testEnv.setup(options.useExistingData, options.useFixtures);
        await runner.connect();
        
        const result = await runner.runScenario(scenarioKey);
        results.push(result);
        
        this.printResults(result);
        
        await runner.cleanup();
        if (!options.keepTestData) {
          await testEnv.cleanup();
        }
        
        // Brief pause between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`❌ ${scenarioKey} failed: ${error}`);
      }
    }
    
    const endTime = new Date();
    this.printSummary(results);
    
    // Save comprehensive test run
    this.saveTestRun(results, startTime, endTime, options);
  }
  
  private printResults(result: TestResult): void {
    const duration = result.endTime!.getTime() - result.startTime.getTime();
    const scenario = TEST_SCENARIOS[result.scenario];
    
    console.log(`\n📊 Results:`);
    console.log(`${result.success ? '✅' : '❌'} Goal Achieved: ${result.success}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`🔧 Tool calls: ${result.toolCalls.length}`);
    
    if (result.reflection) {
      console.log(`\n🤔 Usability Reflection:`);
      console.log(`📈 Bridge Usability Score: ${result.reflection.bridgeUsabilityScore}/10`);
      
      // Show Claude's initial expectations
      console.log(`\n📋 Claude's Initial Expectations:`);
      console.log(result.reflection.expectations);
      
      // Show actual experience summary
      console.log(`\n📝 Actual Experience:`);
      console.log(result.reflection.actualExperience);
      
      if (result.reflection.misalignments.length > 0) {
        console.log(`\n🔍 Identified Misalignments:`);
        result.reflection.misalignments.forEach(mis => {
          const icon = mis.category === 'good_surprise' ? '✨' :
                      mis.category === 'usability_issue' ? '⚠️' :
                      mis.category === 'tool_limitation' ? '🚧' : '📋';
          console.log(`  ${icon} ${mis.description} (${mis.impact} impact)`);
          if (mis.suggestions) {
            console.log(`    💡 Suggestion: ${mis.suggestions}`);
          }
        });
      }
      
      // Show overall assessment
      console.log(`\n📊 Overall Assessment:`);
      console.log(result.reflection.overallAssessment);
    }
    
    if (scenario.successCriteria) {
      console.log(`\n📋 Success Criteria:`);
      scenario.successCriteria.forEach(criteria => {
        console.log(`  ${result.success ? '✅' : '❌'} ${criteria}`);
      });
    }
    
    if (result.errors.length > 0) {
      console.log(`\n🚨 Errors:`);
      result.errors.forEach(err => console.log(`  - ${err}`));
    }
  }
  
  private printSummary(results: TestResult[]): void {
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    const avgDuration = results.reduce((sum, r) => sum + (r.endTime!.getTime() - r.startTime.getTime()), 0) / total;
    
    console.log(`\n🎯 BRIDGE TEST SUITE SUMMARY:`);
    console.log(`✅ Passed: ${passed}/${total} (${Math.round(passed/total*100)}%)`);
    console.log(`⏱️  Avg Duration: ${Math.round(avgDuration)}ms`);
    
    if (passed < total) {
      console.log(`\n❌ Failed scenarios:`);
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.scenarioName}`);
      });
    }
  }
  
  private saveDetailedResults(result: TestResult, options: TestOptions): void {
    const resultsDir = join(process.cwd(), 'test-results');
    mkdirSync(resultsDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${result.scenario}-${timestamp}.json`;
    const filepath = join(resultsDir, filename);
    
    const detailedResult = {
      ...result,
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        dataSource: options.useFixtures ? 'fixtures' : options.useExistingData ? 'existing' : 'empty'
      },
      configuration: options,
      duration: result.endTime!.getTime() - result.startTime.getTime()
    };
    
    writeFileSync(filepath, JSON.stringify(detailedResult, null, 2));
    console.log(`\n💾 Results saved: ${filepath}`);
  }
  
  private saveTestRun(results: TestResult[], startTime: Date, endTime: Date, options: TestOptions): void {
    const resultsDir = join(process.cwd(), 'test-results');
    mkdirSync(resultsDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const runFilename = `test-run-${timestamp}.json`;
    const runFilepath = join(resultsDir, runFilename);
    
    const passed = results.filter(r => r.success).length;
    const totalDuration = endTime.getTime() - startTime.getTime();
    const avgDuration = results.length > 0 ? 
      results.reduce((sum, r) => sum + (r.endTime!.getTime() - r.startTime.getTime()), 0) / results.length : 0;
    
    const testRun: TestRun = {
      timestamp: new Date().toISOString(),
      version: "3.0.0", // Bridge test version
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        dataSource: options.useFixtures ? 'fixtures' : options.useExistingData ? 'existing' : 'empty'
      },
      results: results,
      summary: {
        totalScenarios: results.length,
        passed: passed,
        failed: results.length - passed,
        passRate: results.length > 0 ? passed / results.length : 0,
        avgDuration: avgDuration,
        totalDuration: totalDuration
      }
    };
    
    writeFileSync(runFilepath, JSON.stringify(testRun, null, 2));
    
    // Also update the latest run file for easy access
    const latestFilepath = join(resultsDir, 'latest-run.json');
    writeFileSync(latestFilepath, JSON.stringify(testRun, null, 2));
    
    console.log(`\n📊 Test run saved: ${runFilepath}`);
    console.log(`📈 Latest run: ${latestFilepath}`);
    
    // Save summary trend data
    this.updateTrendData(testRun, resultsDir);
  }
  
  private updateTrendData(testRun: TestRun, resultsDir: string): void {
    const trendFilepath = join(resultsDir, 'trend-data.json');
    
    let trendData: any[] = [];
    if (existsSync(trendFilepath)) {
      try {
        trendData = JSON.parse(readFileSync(trendFilepath, 'utf-8'));
      } catch (error) {
        console.warn('Could not read existing trend data, starting fresh');
      }
    }
    
    // Add current run to trend
    trendData.push({
      timestamp: testRun.timestamp,
      passRate: testRun.summary.passRate,
      avgDuration: testRun.summary.avgDuration,
      totalScenarios: testRun.summary.totalScenarios,
      dataSource: testRun.environment.dataSource
    });
    
    // Keep last 50 runs for trend analysis
    if (trendData.length > 50) {
      trendData = trendData.slice(-50);
    }
    
    writeFileSync(trendFilepath, JSON.stringify(trendData, null, 2));
    console.log(`📈 Trend data updated (${trendData.length} runs tracked)`);
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main(): Promise<void> {
  const [scenario] = process.argv.slice(2);
  const options: TestOptions = {
    useExistingData: process.argv.includes('--use-existing'),
    useFixtures: process.argv.includes('--fixtures'),
    saveResults: process.argv.includes('--save'),
    keepTestData: process.argv.includes('--keep')
  };

  // Default to fixtures if neither existing nor fixtures specified
  if (!options.useExistingData && !options.useFixtures) {
    options.useFixtures = true;
  }
  
  // Default to bridge-exploration if no scenario specified
  const testScenario = scenario || 'bridge-exploration';
  
  if (testScenario === 'help') {
    console.log('Usage: npm run test:bridge [scenario] [options]');
    console.log('\nAvailable Scenarios:');
    Object.entries(TEST_SCENARIOS).forEach(([key, value]) => {
      console.log(`  ${key} - ${value.name}`);
      console.log(`    Goal: ${value.userGoal}`);
    });
    console.log('\nOptions:');
    console.log('  --fixtures      Use synthetic test fixtures (default)');
    console.log('  --use-existing  Use existing bridge.json data');
    console.log('  --keep          Keep test data after completion');
    console.log('\nResults are automatically saved to /test-results/ for tracking improvements');
    return;
  }
  
  const orchestrator = new TestOrchestrator();
  
  try {
    if (TEST_SCENARIOS[testScenario]) {
      await orchestrator.runTest(testScenario, options);
    } else {
      console.error(`❌ Unknown scenario: ${testScenario}`);
      console.log('Run "npm run test:bridge help" to see available scenarios');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { TestOrchestrator, BridgeTestRunner, TEST_SCENARIOS };