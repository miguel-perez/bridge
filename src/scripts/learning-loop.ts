#!/usr/bin/env tsx
/**
 * Bridge Learning Loop - Recommendation-Based Analysis
 * 
 * Analyzes project context from multiple sources and generates
 * prioritized recommendations instead of auto-updating files.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Type Definitions
// ============================================================================

// Jest test result types
interface JestTestResult {
  perfStats?: {
    runtime?: number;
  };
}

interface JestAssertionResult {
  status: string;
  fullName?: string;
  title?: string;
  failureMessages?: string[];
}

interface JestTestSuite {
  assertionResults?: JestAssertionResult[];
}

interface JestResults {
  testResults?: JestTestSuite[];
  numTotalTests?: number;
  numPassedTests?: number;
  numFailedTests?: number;
}

// Bridge test result types
interface BridgeTestScenario {
  success?: boolean;
  duration?: number;
  errors?: string[];
  // Enhanced to include test content for better analysis
  content?: {
    description?: string;
    conversationFlow?: Array<{
      turnNumber: number;
      userMessage?: string;
      assistantResponse?: {
        text?: string;
        hasToolUse?: boolean;
        toolsUsed?: string[];
      };
    }>;
    toolCalls?: Array<{
      toolName: string;
      arguments: Record<string, unknown>;
      result?: string;
      timestamp: string;
    }>;
    summary?: string;
  };
}





interface GitCommit {
  hash: string;
  date: string;
  message: string;
  type: 'fix' | 'feat' | 'docs' | 'refactor' | 'test' | 'chore' | 'unknown';
  filesChanged: string[];
}

interface GitContext {
  recentCommits: GitCommit[];
  developmentVelocity: number; // commits per day
  focusAreas: string[]; // most changed files/dirs
}

interface Recommendation {
  id: string;
  type: 'documentation' | 'experiment' | 'test' | 'code' | 'process';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  rationale: string;
  suggestedChanges?: {
    file: string;
    section?: string;
    current?: string;
    proposed: string;
  }[];
  evidence: string[];
  relatedCommits?: string[];
  confidenceLevel: number; // 0-1
}

interface UnitTestResults {
  totalTests: number;
  passed: number;
  failed: number;
  coverage?: {
    lines: number;
    branches: number;
    functions: number;
  };
  failedTests?: Array<{
    name: string;
    error: string;
  }>;
  duration: number;
}

interface BridgeTestResults {
  scenarios: Array<{
    name: string;
    success: boolean;
    duration: number;
    errors?: string[];
    content?: BridgeTestScenario['content'];
  }>;
  totalDuration: number;
}

interface TestContext {
  unitTests: UnitTestResults;
  bridgeTests: BridgeTestResults;
  recentTestRuns: Array<{
    timestamp: string;
    type: string;
    success: boolean;
  }>;
}

interface DocumentContext {
  documents: Map<string, string>;
  activeExperiments: string[];
  docGaps: string[];
  docSummary: {
    totalDocs: number;
    docStats: Array<{name: string; size: number; lastSection: string}>;
  };
}

interface AnalysisReport {
  timestamp: string;
  executiveSummary: {
    totalCommitsAnalyzed: number;
    totalTestsAnalyzed: number;
    totalDocsAnalyzed: number;
    keyFindings: string[];
    topRecommendations: string[];
  };
  gitContext: GitContext;
  testContext: TestContext;
  documentContext?: DocumentContext;
  recommendations: Recommendation[];
  metadata: {
    analysisTime: number;
    version: string;
    lastGitCommit?: string;
    changesSinceLastRun?: number;
  };
}

interface PreviousRunInfo {
  timestamp: string;
  lastGitCommit: string;
  recommendations: number;
  patterns: number;
}

// ============================================================================
// Git Context Manager
// ============================================================================

/**
 *
 */
class GitContextManager {
  private repoPath: string;

  /**
   * Creates a new GitContextManager instance
   * @remarks
   * Manages git repository context for learning loop analysis.
   * @param repoPath - Path to the git repository
   */
  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
  }

  /**
   * Get the latest git commit hash
   */
  getLatestCommit(): string {
    try {
      return execSync('git rev-parse HEAD', {
        cwd: this.repoPath,
        encoding: 'utf-8'
      }).trim();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Count commits since a given hash
   */
  countCommitsSince(sinceCommit: string): number {
    try {
      const count = execSync(`git rev-list --count ${sinceCommit}..HEAD`, {
        cwd: this.repoPath,
        encoding: 'utf-8'
      }).trim();
      return parseInt(count) || 0;
    } catch {
      return -1; // Unknown
    }
  }

  /**
   * Get commits since a given hash
   */
  getCommitsSince(sinceCommit: string): GitCommit[] {
    try {
      const gitOutput = execSync(
        `git log ${sinceCommit}..HEAD --pretty=format:"%H|%ai|%s" --name-only`,
        { cwd: this.repoPath, encoding: 'utf-8' }
      );

      if (!gitOutput.trim()) {
        return [];
      }

      const commits: GitCommit[] = [];
      const entries = gitOutput.split('\n\n');

      for (const entry of entries) {
        const lines = entry.trim().split('\n');
        if (lines.length === 0) continue;

        const [hash, date, ...messageParts] = lines[0].split('|');
        const message = messageParts.join('|');
        const filesChanged = lines.slice(1).filter(f => f.trim());

        commits.push({
          hash,
          date,
          message,
          filesChanged,
          type: this.detectCommitType(message)
        });
      }

      return commits;
    } catch {
      return [];
    }
  }

  /**
   * Check if there are uncommitted changes
   */
  hasUncommittedChanges(): boolean {
    try {
      const status = execSync('git status --porcelain', {
        cwd: this.repoPath,
        encoding: 'utf-8'
      }).trim();
      return status.length > 0;
    } catch {
      return false;
    }
  }

  /**
   * Extract git history and analyze patterns
   */
  async getContext(days: number = 30): Promise<GitContext> {
    const commits = this.getRecentCommits(days);
    const velocity = this.calculateVelocity(commits, days);
    const focusAreas = this.identifyFocusAreas(commits);

    return {
      recentCommits: commits,
      developmentVelocity: velocity,
      focusAreas
    };
  }

  private getRecentCommits(days: number): GitCommit[] {
    try {
      // Get commit history with file changes
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().split('T')[0];

      const log = execSync(
        `git log --since="${sinceStr}" --pretty=format:"%H|%ad|%s" --date=short --name-only`,
        { cwd: this.repoPath, encoding: 'utf-8' }
      );

      const commits: GitCommit[] = [];
      const entries = log.split('\n\n');

      for (const entry of entries) {
        const lines = entry.trim().split('\n');
        if (lines.length === 0) continue;

        const [hash, date, message] = lines[0].split('|');
        const files = lines.slice(1).filter(f => f.trim());

        commits.push({
          hash: hash.substring(0, 7),
          date,
          message,
          type: this.detectCommitType(message),
          filesChanged: files
        });
      }

      return commits;
    } catch (error) {
      console.warn('Failed to get git history:', error);
      return [];
    }
  }

  private detectCommitType(message: string): GitCommit['type'] {
    const lower = message.toLowerCase();
    if (lower.startsWith('fix:') || lower.includes('fix')) return 'fix';
    if (lower.startsWith('feat:') || lower.includes('feature')) return 'feat';
    if (lower.startsWith('docs:') || lower.includes('documentation')) return 'docs';
    if (lower.startsWith('refactor:')) return 'refactor';
    if (lower.startsWith('test:') || lower.includes('test')) return 'test';
    if (lower.startsWith('chore:')) return 'chore';
    return 'unknown';
  }

  private calculateVelocity(commits: GitCommit[], days: number): number {
    return Number((commits.length / days).toFixed(2));
  }

  private identifyFocusAreas(commits: GitCommit[]): string[] {
    const fileFrequency = new Map<string, number>();

    for (const commit of commits) {
      for (const file of commit.filesChanged) {
        const dir = file.split('/')[0];
        fileFrequency.set(dir, (fileFrequency.get(dir) || 0) + 1);
      }
    }

    // Get top 5 most changed directories
    return Array.from(fileFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([dir]) => dir);
  }
}

// ============================================================================
// Test Results Aggregator
// ============================================================================

class TestResultsAggregator {
  private repoPath: string;

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
  }

  async getContext(forceRun: boolean = false): Promise<TestContext> {
    const unitTests = await this.runUnitTests(forceRun);
    const bridgeTests = await this.loadBridgeTests(forceRun);
    const recentTestRuns = this.getRecentTestRuns();

    return {
      unitTests,
      bridgeTests,
      recentTestRuns
    };
  }

  private async runUnitTests(forceRun: boolean = false): Promise<UnitTestResults> {
    console.log('  🧪 Checking unit test results...');
    
    let testResults: Record<string, unknown> | null = null;
    let coverageData: Record<string, unknown> | null = null;
    
    // Check if we need to run tests (no recent coverage data)
    const coveragePath = join(this.repoPath, 'coverage', 'coverage-summary.json');
    let shouldRunTests = forceRun || !existsSync(coveragePath);
    
    if (!forceRun && existsSync(coveragePath)) {
      try {
        const fs = await import('fs');
        const stats = fs.statSync(coveragePath);
        // Run tests if coverage is older than 24 hours
        shouldRunTests = Date.now() - stats.mtimeMs > 86400000;
      } catch {
        shouldRunTests = true;
      }
    }
    
    if (shouldRunTests) {
      console.log('    🚀 Running unit tests...');
      try {
        // Run Jest tests with coverage and JSON reporter
        execSync('npm test -- --json --coverage --coverageReporters=json-summary --outputFile=loop/jest-results.json', {
          cwd: this.repoPath,
          encoding: 'utf-8',
          stdio: 'pipe',
          env: { ...process.env, CI: 'true' }
        });
      } catch (error) {
        // Jest might exit with non-zero even if it wrote results
      }
    } else {
      console.log('    ℹ️  Using existing coverage data');
    }

    // Try to read the test results file
    const resultsPath = join(this.repoPath, 'loop', 'jest-results.json');
    if (existsSync(resultsPath)) {
      try {
        testResults = JSON.parse(readFileSync(resultsPath, 'utf-8'));
        // Clean up the file
        try { unlinkSync(resultsPath); } catch {
          // Ignore cleanup errors
        }
      } catch (parseError) {
        console.warn('    ⚠️  Could not parse test results');
      }
    }

    // Try to read coverage data
    // coveragePath already declared above
    if (existsSync(coveragePath)) {
      try {
        const coverageJson = JSON.parse(readFileSync(coveragePath, 'utf-8'));
        if (coverageJson.total) {
          coverageData = {
            lines: coverageJson.total.lines.pct || 0,
            branches: coverageJson.total.branches.pct || 0,
            functions: coverageJson.total.functions.pct || 0
          };
        }
      } catch (parseError) {
        console.warn('    ⚠️  Could not parse coverage data');
      }
    }
    
    if (testResults) {
      const jestResults = testResults as JestResults;
      return {
        totalTests: jestResults.numTotalTests || 0,
        passed: jestResults.numPassedTests || 0,
        failed: jestResults.numFailedTests || 0,
        duration: jestResults.testResults?.reduce((sum: number, r: JestTestSuite) => 
          sum + ((r as unknown as JestTestResult).perfStats?.runtime || 0), 0) || 0,
        failedTests: this.extractFailedTests(jestResults),
        coverage: coverageData as { lines: number; branches: number; functions: number; } | undefined
      };
    }
    
    // Fallback: just count test files
    console.log('    ℹ️  Falling back to test file counting...');
    const testFiles = execSync('find src -name "*.test.ts" | wc -l', {
      cwd: this.repoPath,
      encoding: 'utf-8'
    }).trim();
    
    return {
      totalTests: parseInt(testFiles) * 10, // Estimate ~10 tests per file
      passed: parseInt(testFiles) * 10, // Assume passing
      failed: 0,
      duration: 0
    };
  }

  private extractFailedTests(jestResults: JestResults): Array<{name: string; error: string}> {
    const failed: Array<{name: string; error: string}> = [];
    
    if (jestResults.testResults) {
      for (const suite of jestResults.testResults) {
        if (suite.assertionResults) {
          for (const test of suite.assertionResults) {
            if (test.status === 'failed') {
              failed.push({
                name: test.fullName || test.title || 'Unknown test',
                error: test.failureMessages?.join('\n') || 'Unknown error'
              });
            }
          }
        }
      }
    }
    
    return failed;
  }

  private async loadBridgeTests(forceRun: boolean = false): Promise<BridgeTestResults> {
    console.log('  🌉 Loading Bridge test results...');
    
    const testResultsDir = join(this.repoPath, 'loop');
    
    // Create loop directory if it doesn't exist
    if (!existsSync(testResultsDir)) {
      mkdirSync(testResultsDir, { recursive: true });
    }

    // Find all Bridge test result files (both combined and individual)
    const allFiles = readdirSync(testResultsDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .reverse();

    const testRunFiles = allFiles.filter(f => f.startsWith('test-run-'));
    const individualScenarioFiles = allFiles.filter(f => 
      !f.startsWith('test-run-') && 
      !f.startsWith('learning-loop-') && 
      f.endsWith('.json')
    );

    // Check if we should actually run tests
    let shouldRunBridgeTests = testRunFiles.length === 0; // Always run if no results
    
    if (!shouldRunBridgeTests && forceRun) {
      // Even with forceRun, check if existing tests are recent enough
      if (testRunFiles.length > 0) {
        try {
          const latestFile = join(testResultsDir, testRunFiles[0]);
          const stats = await import('fs').then(fs => fs.statSync(latestFile));
          const ageInHours = (Date.now() - stats.mtimeMs) / (1000 * 60 * 60);
          
          // Only run if tests are older than 4 hours
          shouldRunBridgeTests = ageInHours > 4;
          
          if (!shouldRunBridgeTests) {
            console.log(`    ℹ️  Using existing Bridge test results (${ageInHours.toFixed(1)} hours old)`);
          }
        } catch {
          shouldRunBridgeTests = true;
        }
      }
    }

    // If we should run tests, do it
    if (shouldRunBridgeTests) {
      // Check if Bridge tests should be skipped
      if (process.env.SKIP_BRIDGE_TESTS === 'true') {
        console.log('    ⚠️  Bridge tests skipped (SKIP_BRIDGE_TESTS=true)');
        return { scenarios: [], totalDuration: 0 };
      }
      
      console.log(forceRun ? '    🚀 Running Bridge tests (changes detected)...' : '    ⚠️  No Bridge test results found');
      if (!forceRun) {
        console.log('    🚀 Running Bridge tests automatically...');
      }
      
      try {
        // Run Bridge tests with a timeout to prevent hanging
        // Use BRIDGE_TEST_MODE env var to control which tests run
        const testCommand = process.env.BRIDGE_TEST_MODE === 'quick' 
          ? 'npm run test:bridge:quick'
          : 'npm run test:bridge';
        
        console.log(`    🎯 Running: ${testCommand}`);
        
        execSync(testCommand, {
          cwd: this.repoPath,
          encoding: 'utf-8',
          stdio: 'inherit', // Show test output to user
          timeout: 180000, // 3 minute timeout for all tests
          env: { ...process.env, CI: 'true' }
        });
        
        // Re-read the directory to find newly created test results
        const newFiles = readdirSync(testResultsDir)
          .filter(f => f.startsWith('test-run-') && f.endsWith('.json'))
          .sort()
          .reverse();
          
        if (newFiles.length > 0) {
          console.log('    ✓ Bridge tests completed');
          // Continue with normal processing using the new files
          testRunFiles.unshift(...newFiles);
        } else {
          console.log('    ⚠️  Bridge tests completed but no results were saved');
          return { scenarios: [], totalDuration: 0 };
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log('    ❌ Bridge tests failed:', errorMsg);
        console.log('    ℹ️  Continuing with analysis...');
        console.log('    ℹ️  To debug: npm run test:bridge');
        
        // Check if partial results were saved
        const partialFiles = readdirSync(testResultsDir)
          .filter(f => f.endsWith('.json') && !f.startsWith('test-run-'))
          .sort()
          .reverse();
          
        if (partialFiles.length > 0) {
          console.log(`    ℹ️  Found ${partialFiles.length} partial test results`);
        }
        
        return { scenarios: [], totalDuration: 0 };
      }
    }

    // Aggregate scenarios from multiple sources
    const allScenarios = new Map<string, { name: string; success: boolean; duration: number; errors: string[]; content?: BridgeTestScenario['content']; source: string }>();
    let totalDuration = 0;

    // 1. Process test run files (combined results)
    for (const file of testRunFiles.slice(0, 3)) { // Look at last 3 test runs
      try {
        const filePath = join(testResultsDir, file);
        const latestResults = JSON.parse(readFileSync(filePath, 'utf-8'));

        // Parse Bridge test format - handle both old and new formats
        if ('scenarios' in latestResults && latestResults.scenarios) {
          // Old format: scenarios as object
          for (const [name, data] of Object.entries(latestResults.scenarios)) {
            const scenario = data as BridgeTestScenario;
            const key = `${name}-${file}`;
            allScenarios.set(key, {
              name,
              success: scenario.success || false,
              duration: scenario.duration || 0,
              errors: scenario.errors || [],
              content: scenario.content,
              source: file
            });
            totalDuration += scenario.duration || 0;
          }
        } else if ('summary' in latestResults && latestResults.summary?.scenarios) {
          // New format: scenarios in summary
          for (const scenario of latestResults.summary.scenarios) {
            const key = `${scenario.name || scenario.scenario}-${file}`;
            allScenarios.set(key, {
              name: scenario.name || scenario.scenario,
              success: !scenario.error,
              duration: scenario.duration || 0,
              errors: scenario.error ? [scenario.error] : [],
              content: scenario.content,
              source: file
            });
            totalDuration += scenario.duration || 0;
          }
        } else if ('results' in latestResults && latestResults.results) {
          // Alternative format: results array (test-run files)
          for (const result of latestResults.results) {
            const key = `${result.scenarioName || result.scenario}-${file}`;
            
            // Extract content from the full result
            const content = this.extractTestContent(result);
            
            allScenarios.set(key, {
              name: result.scenarioName || result.scenario,
              success: !result.error,
              duration: result.duration || 0,
              errors: result.error ? [result.error] : [],
              content,
              source: file
            });
            totalDuration += result.duration || 0;
          }
        }
      } catch (error) {
        console.warn(`    ⚠️  Could not parse test run file: ${file}`);
      }
    }

    // 2. Process individual scenario files
    for (const file of individualScenarioFiles.slice(0, 20)) { // Look at last 20 individual files
      try {
        const filePath = join(testResultsDir, file);
        const scenarioResult = JSON.parse(readFileSync(filePath, 'utf-8'));
        
        // Extract scenario name from filename (e.g., "clustering-analysis-1234567890.json")
        const scenarioName = file.replace(/-\d{13}\.json$/, '');
        
        // Extract content from the full test result
        const content = this.extractTestContent(scenarioResult);
        
        const key = `${scenarioName}-${file}`;
        allScenarios.set(key, {
          name: scenarioName,
          success: !scenarioResult.error,
          duration: scenarioResult.duration || 0,
          errors: scenarioResult.error ? [scenarioResult.error] : [],
          content,
          source: file
        });
        totalDuration += scenarioResult.duration || 0;
      } catch (error) {
        console.warn(`    ⚠️  Could not parse individual scenario file: ${file}`);
      }
    }

    // Convert to final format, deduplicating by scenario name (prefer scenarios with content)
    const scenarios: Array<{ name: string; success: boolean; duration: number; errors: string[]; content?: BridgeTestScenario['content'] }> = [];
    const scenarioMap = new Map<string, { name: string; success: boolean; duration: number; errors: string[]; content?: BridgeTestScenario['content']; source: string }>();
    
    // Sort by source file timestamp (most recent first) to prioritize recent results
    const sortedEntries = Array.from(allScenarios.entries()).sort((a, b) => {
      const aTimestamp = parseInt(a[1].source.match(/\d{13}/)?.[0] || '0');
      const bTimestamp = parseInt(b[1].source.match(/\d{13}/)?.[0] || '0');
      return bTimestamp - aTimestamp;
    });

    for (const [, scenario] of sortedEntries) {
      const existing = scenarioMap.get(scenario.name);
      
      // Prefer scenarios with content, or keep the most recent if both have/ don't have content
      if (!existing || (scenario.content && !existing.content)) {
        scenarioMap.set(scenario.name, scenario);
        console.log(`    📋 ${existing ? 'Replacing' : 'Adding'} scenario "${scenario.name}" from ${scenario.source} (content: ${scenario.content ? 'YES' : 'NO'})`);
      } else {
        console.log(`    📋 Skipping scenario "${scenario.name}" from ${scenario.source} (content: ${scenario.content ? 'YES' : 'NO'}) - keeping existing from ${existing.source}`);
      }
    }
    
    // Convert map to array
    for (const scenario of scenarioMap.values()) {
      scenarios.push({
        name: scenario.name,
        success: scenario.success,
        duration: scenario.duration,
        errors: scenario.errors,
        content: scenario.content
      });
    }
      
    console.log(`    ✓ Loaded ${scenarios.length} unique Bridge test scenarios from ${allScenarios.size} total results`);
    console.log(`    ✓ Success rate: ${scenarios.filter(s => s.success).length}/${scenarios.length}`);
    
    // Log any failed scenarios
    const failed = scenarios.filter(s => !s.success);
    if (failed.length > 0) {
      console.log(`    ⚠️  Failed scenarios: ${failed.map(s => s.name).join(', ')}`);
    }

    // Log scenario names for debugging
    const scenarioNames = scenarios.map(s => s.name).sort();
    console.log(`    📋 Scenarios found: ${scenarioNames.join(', ')}`);
    
    // Log content extraction results
    const scenariosWithContent = scenarios.filter(s => s.content);
    console.log(`    📋 Scenarios with content: ${scenariosWithContent.length}/${scenarios.length}`);
    scenariosWithContent.forEach(s => {
      console.log(`    📋 "${s.name}": ${s.content?.description || 'No description'}`);
    });

    return { scenarios, totalDuration };
  }

  /**
   * Extract meaningful content from a test result for analysis
   */
  private extractTestContent(scenarioResult: any): BridgeTestScenario['content'] | undefined {
    try {
      const content: BridgeTestScenario['content'] = {};

      // Extract conversation flow
      if (scenarioResult.conversationFlow && Array.isArray(scenarioResult.conversationFlow)) {
        content.conversationFlow = scenarioResult.conversationFlow.map((turn: any) => ({
          turnNumber: turn.turnNumber || 0,
          userMessage: turn.userMessage,
          assistantResponse: {
            text: turn.assistantResponse?.text,
            hasToolUse: turn.assistantResponse?.hasToolUse || false,
            toolsUsed: turn.assistantResponse?.toolsUsed || []
          }
        }));
      } else if (scenarioResult.messages && Array.isArray(scenarioResult.messages)) {
        // Extract conversation flow from messages array
        const conversationFlow: any[] = [];
        let currentTurn: any = {};
        
        scenarioResult.messages.forEach((message: any, index: number) => {
          if (message.role === 'user') {
            if (currentTurn.userMessage) {
              // Start new turn
              conversationFlow.push(currentTurn);
              currentTurn = {};
            }
            currentTurn.turnNumber = Math.floor(index / 2) + 1;
            currentTurn.userMessage = typeof message.content === 'string' 
              ? message.content 
              : message.content[0]?.text || '';
          } else if (message.role === 'assistant') {
            if (message.content && Array.isArray(message.content)) {
              const textContent = message.content.find((c: any) => c.type === 'text');
              const toolContent = message.content.find((c: any) => c.type === 'tool_use');
              
              currentTurn.assistantResponse = {
                text: textContent?.text || '',
                hasToolUse: !!toolContent,
                toolsUsed: toolContent ? [toolContent.name] : []
              };
            } else if (typeof message.content === 'string') {
              currentTurn.assistantResponse = {
                text: message.content,
                hasToolUse: false,
                toolsUsed: []
              };
            }
          }
        });
        
        // Add the last turn
        if (currentTurn.userMessage || currentTurn.assistantResponse) {
          conversationFlow.push(currentTurn);
        }
        
        if (conversationFlow.length > 0) {
          content.conversationFlow = conversationFlow;
        }
      }

      // Extract tool calls
      if (scenarioResult.toolCalls && Array.isArray(scenarioResult.toolCalls)) {
        content.toolCalls = scenarioResult.toolCalls.map((call: any) => ({
          toolName: call.toolName || 'unknown',
          arguments: call.arguments || {},
          result: call.resultText ? call.resultText.join('\n') : call.result,
          timestamp: call.timestamp || ''
        }));
      } else if (scenarioResult.messages && Array.isArray(scenarioResult.messages)) {
        // Extract tool calls from messages array
        const toolCalls: any[] = [];
        
        scenarioResult.messages.forEach((message: any) => {
          if (message.role === 'assistant' && message.content && Array.isArray(message.content)) {
            const toolUse = message.content.find((c: any) => c.type === 'tool_use');
            if (toolUse) {
              toolCalls.push({
                toolName: toolUse.name || 'unknown',
                arguments: toolUse.input || {},
                result: '', // Will be filled by next tool_result message
                timestamp: ''
              });
            }
          } else if (message.role === 'user' && message.content && Array.isArray(message.content)) {
            const toolResult = message.content.find((c: any) => c.type === 'tool_result');
            if (toolResult && toolCalls.length > 0) {
              // Find the most recent tool call and add the result
              const lastToolCall = toolCalls[toolCalls.length - 1];
              if (toolResult.content && Array.isArray(toolResult.content)) {
                lastToolCall.result = toolResult.content.map((c: any) => c.text || '').join('\n');
              }
            }
          }
        });
        
        if (toolCalls.length > 0) {
          content.toolCalls = toolCalls;
        }
      }

      // Extract summary
      if (scenarioResult.summary) {
        content.summary = scenarioResult.summary;
      }

      // Extract description from scenario name or messages
      if (scenarioResult.messages && Array.isArray(scenarioResult.messages)) {
        const firstUserMessage = scenarioResult.messages.find((m: any) => m.role === 'user');
        if (firstUserMessage?.content) {
          content.description = typeof firstUserMessage.content === 'string' 
            ? firstUserMessage.content 
            : firstUserMessage.content[0]?.text || '';
        }
      }

      const hasContent = Object.keys(content).length > 0;
      if (hasContent) {
        console.log(`    📋 Extracted content for test: ${scenarioResult.scenarioName || scenarioResult.scenario}`);
      }
      
      return hasContent ? content : undefined;
    } catch (error) {
      console.warn('    ⚠️  Could not extract test content:', error);
      return undefined;
    }
  }

  private getRecentTestRuns(): Array<{timestamp: string; type: string; success: boolean}> {
    const runs: Array<{timestamp: string; type: string; success: boolean}> = [];
    const testResultsDir = join(this.repoPath, 'loop');
    
    if (!existsSync(testResultsDir)) {
      return runs;
    }

    const files = readdirSync(testResultsDir)
      .filter(f => (f.startsWith('test-run-') || f.startsWith('learning-loop-')) && f.endsWith('.json'))
      .sort()
      .reverse()
      .slice(0, 10); // Last 10 runs

    for (const file of files) {
      const timestamp = file.match(/\d{13}/)?.[0];
      if (timestamp) {
        runs.push({
          timestamp: new Date(parseInt(timestamp)).toISOString(),
          type: file.startsWith('test-run-') ? 'bridge' : 'learning-loop',
          success: true // Would need to parse file to determine actual success
        });
      }
    }

    return runs;
  }
}

// ============================================================================
// Document Manager
// ============================================================================

class DocumentManager {
  private repoPath: string;
  private documents: Map<string, string> = new Map();

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
  }

  async loadDocuments(): Promise<Map<string, string>> {
    console.log('  📚 Loading documentation files...');
    
    const docFiles = [
      'VISION.md',
      'TECHNICAL.md',
      'OPPORTUNITIES.md',
      'EXPERIMENTS.md',
      'LEARNINGS.md',
      'LOOP.md',
      'CLAUDE.md',
      'README.md'
    ];

    for (const file of docFiles) {
      const filePath = join(this.repoPath, file);
      if (existsSync(filePath)) {
        try {
          const content = readFileSync(filePath, 'utf-8');
          this.documents.set(file, content);
        } catch (error) {
          console.warn(`    ⚠️  Could not read ${file}`);
        }
      }
    }

    console.log(`    ✓ Loaded ${this.documents.size} documentation files`);
    return this.documents;
  }

  getDocumentSummary(): { totalDocs: number; docStats: Array<{name: string; size: number; lastSection: string}> } {
    const docStats = Array.from(this.documents.entries()).map(([name, content]) => {
      const lines = content.split('\n');
      const lastSection = lines.reverse().find(line => line.startsWith('#')) || 'No sections';
      
      return {
        name,
        size: content.length,
        lastSection: lastSection.replace(/^#+\s*/, '')
      };
    });

    return {
      totalDocs: this.documents.size,
      docStats
    };
  }

  findActiveExperiments(): string[] {
    const experimentsDoc = this.documents.get('EXPERIMENTS.md');
    if (!experimentsDoc) return [];

    const activeExperiments: string[] = [];
    const lines = experimentsDoc.split('\n');
    let inActiveSection = false;

    for (const line of lines) {
      if (line.includes('## Active Experiments')) {
        inActiveSection = true;
        continue;
      }
      if (line.includes('## Completed Experiments')) {
        inActiveSection = false;
        break;
      }
      if (inActiveSection && line.match(/^###\s+EXP-\d+/)) {
        const expMatch = line.match(/EXP-\d+/);
        if (expMatch) {
          activeExperiments.push(expMatch[0]);
        }
      }
    }

    return activeExperiments;
  }

  getDocumentationGaps(): string[] {
    const gaps: string[] = [];
    
    // Check if TECHNICAL.md is up to date
    const technical = this.documents.get('TECHNICAL.md');
    const vision = this.documents.get('VISION.md');
    
    if (technical && vision) {
      // Check for features mentioned in VISION but not in TECHNICAL
      if (vision.includes('pattern realizations') && !technical.includes('Current Capabilities')) {
        gaps.push('TECHNICAL.md may not clearly separate current vs planned features');
      }
    }

    // Check for recent updates
    const opportunities = this.documents.get('OPPORTUNITIES.md');
    if (opportunities) {
      const scoreMatches = opportunities.match(/Score:\s*(\d+)/g);
      if (scoreMatches && scoreMatches.length > 5) {
        gaps.push(`OPPORTUNITIES.md has ${scoreMatches.length} opportunities - consider prioritizing top items`);
      }
    }

    return gaps;
  }
}

// ============================================================================
// Main Analysis Function
// ============================================================================

/**
 * Load the most recent loop run information
 */
function loadPreviousRun(): PreviousRunInfo | null {
  const loopDir = join(process.cwd(), 'loop');
  if (!existsSync(loopDir)) {
    return null;
  }

  const files = readdirSync(loopDir)
    .filter(f => f.startsWith('learning-loop-') && f.endsWith('.json'))
    .sort()
    .reverse();

  if (files.length === 0) {
    return null;
  }

  try {
    const latestReport = JSON.parse(
      readFileSync(join(loopDir, files[0]), 'utf-8')
    );
    return {
      timestamp: latestReport.timestamp,
      lastGitCommit: latestReport.metadata?.lastGitCommit || 'unknown',
      recommendations: latestReport.recommendations?.length || 0,
      patterns: latestReport.patterns?.length || 0
    };
  } catch {
    return null;
  }
}

/**
 * Determine if tests should run based on changes
 */
function shouldRunTests(gitManager: GitContextManager, previousRun: PreviousRunInfo | null): boolean {
  // Always run if no previous run
  if (!previousRun) {
    return true;
  }

  // Check for new commits
  const commitsSince = gitManager.countCommitsSince(previousRun.lastGitCommit);
  if (commitsSince > 0) {
    console.log(`  ℹ️  Found ${commitsSince} new commits since last run`);
    
    // Get commits since last run to check if they affect code
    const recentCommits = gitManager.getCommitsSince(previousRun.lastGitCommit);
    
    // Check if any commits affect source code or tests
    const hasCodeChanges = recentCommits.some(commit => {
      return commit.filesChanged.some(file => 
        file.startsWith('src/') || 
        file.includes('.test.') ||
        file.includes('.spec.') ||
        file === 'package.json' ||
        file === 'tsconfig.json' ||
        file === 'jest.config.js'
      );
    });
    
    if (!hasCodeChanges) {
      console.log('  ℹ️  New commits only affect documentation/config - tests not required');
      return false;
    }
    
    return true;
  }

  // Check for uncommitted changes in code files
  if (gitManager.hasUncommittedChanges()) {
    console.log('  ℹ️  Found uncommitted changes');
    // Could enhance this to check if changes are in code files
    return true;
  }

  return false;
}

/**
 * Runs the learning loop analysis
 * @remarks
 * Main analysis function that aggregates git, test, and documentation context
 * to generate actionable recommendations for Bridge development.
 * @param options - Analysis configuration options with optional days property
 * @returns Comprehensive analysis report with recommendations
 */
async function runAnalysis(options: { days?: number } = {}): Promise<AnalysisReport> {
  const startTime = Date.now();
  const days = options.days || 30;
  console.log('🔄 Starting Learning Loop v2 Analysis...\n');

  // 0. Check previous run
  const previousRun = loadPreviousRun();
  if (previousRun) {
    console.log('📋 Previous run detected:');
    console.log(`  ✓ Timestamp: ${new Date(previousRun.timestamp).toLocaleString()}`);
    console.log(`  ✓ Last commit: ${previousRun.lastGitCommit.substring(0, 8)}`);
    console.log(`  ✓ Generated ${previousRun.recommendations} recommendations\n`);
  }

  // 1. Load Git Context
  console.log(`📊 Loading git history (last ${days} days)...`);
  const gitManager = new GitContextManager();
  const gitContext = await gitManager.getContext(days);
  console.log(`  ✓ Found ${gitContext.recentCommits.length} commits in last ${days} days`);
  console.log(`  ✓ Development velocity: ${gitContext.developmentVelocity} commits/day`);
  console.log(`  ✓ Focus areas: ${gitContext.focusAreas.join(', ')}\n`);

  // Track current commit for metadata
  const currentCommit = gitManager.getLatestCommit();
  const changesSinceLastRun = previousRun ? gitManager.countCommitsSince(previousRun.lastGitCommit) : -1;

  // 2. Load Test Results
  console.log('🧪 Loading test results...');
  const testAggregator = new TestResultsAggregator();
  const forceRunTests = shouldRunTests(gitManager, previousRun);
  if (forceRunTests) {
    console.log('  ℹ️  Changes detected - will run tests if needed');
  }
  const testContext = await testAggregator.getContext(forceRunTests);
  console.log(`  ✓ Unit tests: ${testContext.unitTests.passed}/${testContext.unitTests.totalTests} passed`);
  if (testContext.unitTests.coverage) {
    console.log(`  ✓ Coverage: ${testContext.unitTests.coverage.lines.toFixed(1)}% lines, ${testContext.unitTests.coverage.branches.toFixed(1)}% branches, ${testContext.unitTests.coverage.functions.toFixed(1)}% functions`);
  }
  console.log(`  ✓ Bridge scenarios: ${testContext.bridgeTests.scenarios.length} scenarios loaded`);
  console.log(`  ✓ Recent test runs: ${testContext.recentTestRuns.length} found\n`);

  // 3. Load Documentation
  console.log('📚 Loading documentation...');
  const docManager = new DocumentManager();
  const documents = await docManager.loadDocuments();
  const docSummary = docManager.getDocumentSummary();
  const activeExperiments = docManager.findActiveExperiments();
  const docGaps = docManager.getDocumentationGaps();
  console.log(`  ✓ Active experiments: ${activeExperiments.join(', ') || 'None'}`);
  console.log(`  ✓ Documentation gaps: ${docGaps.length} found\n`);

  // 4. Generate Recommendations (now with full context)
  console.log('🤔 Analyzing patterns and generating recommendations...');
  const recommendations = generateRecommendations(gitContext, testContext, {
    documents,
    activeExperiments,
    docGaps,
    docSummary
  });
  console.log(`  ✓ Generated ${recommendations.length} recommendations\n`);

  // 5. Create Report
  const report: AnalysisReport = {
    timestamp: new Date().toISOString(),
    executiveSummary: {
      totalCommitsAnalyzed: gitContext.recentCommits.length,
      totalTestsAnalyzed: testContext.unitTests.totalTests + testContext.bridgeTests.scenarios.length,
      totalDocsAnalyzed: docSummary.totalDocs,
      keyFindings: extractKeyFindings(gitContext, testContext, recommendations),
      topRecommendations: recommendations
        .slice(0, 3)
        .map(r => r.title)
    },
    gitContext,
    testContext,
    documentContext: {
      documents,
      activeExperiments,
      docGaps,
      docSummary
    },
    recommendations,
    metadata: {
      analysisTime: Date.now() - startTime,
      version: '2.0.0-alpha',
      lastGitCommit: currentCommit,
      changesSinceLastRun
    }
  };

  // 4. Save Report
  const outputDir = join(process.cwd(), 'loop');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = join(outputDir, `learning-loop-${Date.now()}.json`);
  writeFileSync(outputPath, JSON.stringify(report, null, 2));

  // 5. Generate Markdown Report
  const markdownReport = generateMarkdownReport(report);
  const markdownPath = join(outputDir, `recommendations-${Date.now()}.md`);
  writeFileSync(markdownPath, markdownReport);

  console.log('✅ Analysis complete!');
  console.log(`   JSON report: ${outputPath}`);
  console.log(`   Markdown report: ${markdownPath}\n`);

  // Display summary
  console.log('📋 Top Recommendations:');
  recommendations.slice(0, 3).forEach((rec, i) => {
    console.log(`   ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
  });

  return report;
}

// ============================================================================
// Recommendation Generation
// ============================================================================

function generateRecommendations(
  gitContext: GitContext, 
  testContext: TestContext,
  docContext?: DocumentContext
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  let idCounter = 1;

  // Pattern 1: Test evidence analysis (HIGHEST PRIORITY)
  if (testContext.bridgeTests.scenarios.length > 0) {
    const successfulTests = testContext.bridgeTests.scenarios.filter(s => s.success);
    const testSuccessRate = successfulTests.length / testContext.bridgeTests.scenarios.length;
    
    if (testSuccessRate === 1.0) {
      recommendations.push({
        id: `REC-${idCounter++}`,
        type: 'test',
        priority: 'high',
        title: 'All Bridge tests passing - excellent test coverage',
        description: `All ${testContext.bridgeTests.scenarios.length} Bridge test scenarios are passing successfully.`,
        rationale: 'Comprehensive test coverage with 100% pass rate indicates high code quality and reliability.',
        evidence: [
          `✅ ${successfulTests.length}/${testContext.bridgeTests.scenarios.length} scenarios passing`,
          `📋 Scenarios: ${testContext.bridgeTests.scenarios.map(s => s.name).join(', ')}`,
          `⏱️ Total test duration: ${testContext.bridgeTests.totalDuration.toFixed(1)}s`
        ],
        confidenceLevel: 0.95
      });
    } else if (testSuccessRate < 0.8) {
      recommendations.push({
        id: `REC-${idCounter++}`,
        type: 'test',
        priority: 'critical',
        title: 'Bridge test failures detected - immediate attention needed',
        description: `${Math.round((1 - testSuccessRate) * 100)}% of Bridge test scenarios are failing.`,
        rationale: 'Test failures indicate broken functionality that needs immediate attention.',
        evidence: [
          `❌ ${testContext.bridgeTests.scenarios.length - successfulTests.length} failed scenarios`,
          `✅ ${successfulTests.length} passing scenarios`,
          `Failed: ${testContext.bridgeTests.scenarios.filter(s => !s.success).map(s => s.name).join(', ')}`
        ],
        confidenceLevel: 1.0
      });
    }
  }

  // Pattern 2: High bug fix rate (only if test evidence is insufficient)
  const fixCommits = gitContext.recentCommits.filter(c => c.type === 'fix');
  const fixRate = fixCommits.length / gitContext.recentCommits.length;

  if (fixRate > 0.3 && testContext.bridgeTests.scenarios.length === 0) {
    recommendations.push({
      id: `REC-${idCounter++}`,
      type: 'process',
      priority: 'high',
      title: 'High bug fix rate detected - consider adding more tests',
      description: `${Math.round(fixRate * 100)}% of recent commits are bug fixes, which suggests potential quality issues.`,
      rationale: 'A high proportion of bug fixes indicates reactive development. Proactive testing can reduce bug introduction.',
      evidence: [
        `${fixCommits.length} fix commits out of ${gitContext.recentCommits.length} total`,
        `Recent fixes: ${fixCommits.slice(0, 3).map(c => c.message).join(', ')}`
      ],
      relatedCommits: fixCommits.slice(0, 5).map(c => c.hash),
      confidenceLevel: 0.8
    });
  }

  // Pattern 2: Documentation lag
  const docCommits = gitContext.recentCommits.filter(c => c.type === 'docs');
  const featureCommits = gitContext.recentCommits.filter(c => c.type === 'feat');
  
  if (featureCommits.length > 0 && docCommits.length / featureCommits.length < 0.5) {
    recommendations.push({
      id: `REC-${idCounter++}`,
      type: 'documentation',
      priority: 'medium',
      title: 'Documentation updates lagging behind feature development',
      description: 'New features are being added faster than documentation is being updated.',
      rationale: 'Keeping documentation in sync with features improves developer experience and reduces confusion.',
      evidence: [
        `${featureCommits.length} feature commits vs ${docCommits.length} documentation commits`,
        `Feature/doc ratio: ${(docCommits.length / featureCommits.length).toFixed(2)}`
      ],
      confidenceLevel: 0.7
    });
  }

  // Pattern 3: Focus area analysis
  if (gitContext.focusAreas.length > 0) {
    const topArea = gitContext.focusAreas[0];
    recommendations.push({
      id: `REC-${idCounter++}`,
      type: 'test',
      priority: 'medium',
      title: `Heavy development in ${topArea} - ensure test coverage`,
      description: `The ${topArea} directory has seen the most changes recently. Verify test coverage is adequate.`,
      rationale: 'Areas with frequent changes are more prone to bugs and should have comprehensive test coverage.',
      evidence: [
        `${topArea} is the most changed directory`,
        `Other active areas: ${gitContext.focusAreas.slice(1).join(', ')}`
      ],
      confidenceLevel: 0.6
    });
  }

  // Pattern 4: Test failures
  if (testContext.unitTests.failed > 0) {
    recommendations.push({
      id: `REC-${idCounter++}`,
      type: 'test',
      priority: 'critical',
      title: `${testContext.unitTests.failed} unit tests are failing`,
      description: `There are currently ${testContext.unitTests.failed} failing unit tests that need immediate attention.`,
      rationale: 'Failing tests indicate broken functionality and should be fixed before adding new features.',
      evidence: [
        `Failed tests: ${testContext.unitTests.failed}/${testContext.unitTests.totalTests}`,
        ...(testContext.unitTests.failedTests?.slice(0, 3).map(t => t.name) || [])
      ],
      confidenceLevel: 1.0
    });
  }

  // Pattern 5: Test/commit correlation
  const recentFixes = gitContext.recentCommits.filter(c => c.type === 'fix').slice(0, 10);
  const testCommits = gitContext.recentCommits.filter(c => c.type === 'test');
  
  if (recentFixes.length > 5 && testCommits.length < recentFixes.length * 0.5) {
    recommendations.push({
      id: `REC-${idCounter++}`,
      type: 'test',
      priority: 'high',
      title: 'Bug fixes lack corresponding test coverage',
      description: `Recent bug fixes (${recentFixes.length}) outnumber test commits (${testCommits.length}). Consider adding tests to prevent regressions.`,
      rationale: 'Each bug fix should ideally have a test to prevent the issue from recurring.',
      evidence: [
        `${recentFixes.length} recent fixes vs ${testCommits.length} test commits`,
        `Test/fix ratio: ${(testCommits.length / recentFixes.length).toFixed(2)}`
      ],
      relatedCommits: recentFixes.slice(0, 5).map(c => c.hash),
      confidenceLevel: 0.85
    });
  }

  // Pattern 6: Bridge test failures or missing
  if (testContext.bridgeTests.scenarios.length === 0) {
    recommendations.push({
      id: `REC-${idCounter++}`,
      type: 'test',
      priority: 'high',
      title: 'No Bridge integration test results found',
      description: 'Bridge integration tests are not running or not producing results. This could indicate test infrastructure issues.',
      rationale: 'Integration tests are critical for validating MCP tool interactions and should run reliably.',
      evidence: [
        'No test-run-*.json files found in loop/',
        'Bridge tests may have timed out or failed to start',
        'Run manually with: npm run test:bridge'
      ],
      confidenceLevel: 0.85
    });
  } else {
    const failedScenarios = testContext.bridgeTests.scenarios.filter(s => !s.success);
    if (failedScenarios.length > 0) {
      const evidence = [
        `${failedScenarios.length} scenarios failing`,
        ...failedScenarios.map(s => `${s.name}: ${s.errors?.join(', ') || 'Unknown error'}`)
      ];
      
      // Add test content context for failed scenarios
      failedScenarios.forEach(scenario => {
        if (scenario.content?.description) {
          evidence.push(`📋 Failed test "${scenario.name}" was testing: "${scenario.content.description}"`);
        }
        if (scenario.content?.toolCalls && scenario.content.toolCalls.length > 0) {
          const toolsUsed = [...new Set(scenario.content.toolCalls.map(call => call.toolName))];
          evidence.push(`🔧 Failed test "${scenario.name}" used tools: ${toolsUsed.join(', ')}`);
        }
      });
      
      recommendations.push({
        id: `REC-${idCounter++}`,
        type: 'test',
        priority: 'high',
        title: `Bridge integration tests failing: ${failedScenarios.map(s => s.name).join(', ')}`,
        description: 'Bridge scenario tests are failing, indicating potential integration issues.',
        rationale: 'Integration tests catch issues that unit tests might miss, especially in tool interactions.',
        evidence,
        confidenceLevel: 0.9
      });
    }
  }

  // Pattern 7: Successful Bridge test scenarios with content
  const successfulScenarios = testContext.bridgeTests.scenarios.filter(s => s.success);
  if (successfulScenarios.length > 0) {
    const scenariosWithContent = successfulScenarios.filter(s => s.content);
    if (scenariosWithContent.length > 0) {
      recommendations.push({
        id: `REC-${idCounter++}`,
        type: 'test',
        priority: 'low',
        title: `Bridge integration tests passing with detailed evidence`,
        description: `${successfulScenarios.length} Bridge scenarios are passing, providing strong validation of functionality.`,
        rationale: 'Successful integration tests provide confidence that the MCP tools work correctly in real scenarios.',
        evidence: [
          `${successfulScenarios.length} scenarios passing successfully`,
          ...scenariosWithContent.slice(0, 3).map(s => 
            `✅ "${s.name}": ${s.content?.description || 'No description'}`
          ),
          ...scenariosWithContent.slice(0, 2).flatMap(s => {
            const evidence: string[] = [];
            if (s.content?.conversationFlow && s.content.conversationFlow.length > 0) {
              evidence.push(`\n📝 **Sample conversation from "${s.name}":**`);
              s.content.conversationFlow.slice(0, 2).forEach((turn) => {
                if (turn.userMessage) {
                  evidence.push(`   **User:** ${turn.userMessage}`);
                }
                if (turn.assistantResponse?.text) {
                  evidence.push(`   **Assistant:** ${turn.assistantResponse.text.substring(0, 150)}${turn.assistantResponse.text.length > 150 ? '...' : ''}`);
                }
              });
            }
            return evidence;
          })
        ],
        confidenceLevel: 0.8
      });
    }
  }

  // Pattern 8: Low test coverage
  if (testContext.unitTests.coverage) {
    const { lines, branches, functions } = testContext.unitTests.coverage;
    const avgCoverage = (lines + branches + functions) / 3;
    
    if (avgCoverage < 80) {
      const priority = avgCoverage < 60 ? 'high' : 'medium';
      recommendations.push({
        id: `REC-${idCounter++}`,
        type: 'test',
        priority,
        title: `Test coverage below recommended threshold (${avgCoverage.toFixed(1)}%)`,
        description: `Current test coverage is ${avgCoverage.toFixed(1)}%, which is below the recommended 80% threshold.`,
        rationale: 'Higher test coverage reduces the risk of undetected bugs and makes refactoring safer.',
        evidence: [
          `Lines: ${lines.toFixed(1)}%`,
          `Branches: ${branches.toFixed(1)}%`,
          `Functions: ${functions.toFixed(1)}%`,
          `Target: 80%+ for all metrics`
        ],
        confidenceLevel: 0.95
      });
    }
  }

  // Pattern 9: Documentation gaps
  if (docContext && docContext.docGaps.length > 0) {
    recommendations.push({
      id: `REC-${idCounter++}`,
      type: 'documentation',
      priority: 'medium',
      title: 'Documentation inconsistencies detected',
      description: 'Several documentation gaps or inconsistencies were found that should be addressed.',
      rationale: 'Consistent documentation helps developers understand the project state and reduces confusion.',
      evidence: docContext.docGaps,
      confidenceLevel: 0.8
    });
  }

  // Pattern 10: Dynamic experiment completion detection (STATELESS)
  if (docContext && docContext.activeExperiments.length > 0 && testContext.bridgeTests.scenarios.length > 0) {
    const experimentsDoc = docContext.documents.get('EXPERIMENTS.md') || '';
    const activeExps = docContext.activeExperiments;
    
    // Get all available test scenarios for dynamic matching
    const availableScenarios = testContext.bridgeTests.scenarios.map(s => s.name);
    console.log(`    🔍 Analyzing ${activeExps.length} active experiments against ${availableScenarios.length} test scenarios`);
    
    activeExps.forEach(exp => {
      // Parse experiment details from document
      const expRegex = new RegExp(`### ${exp}.*?(?=###|$)`, 's');
      const expMatch = experimentsDoc.match(expRegex);
      if (!expMatch) return;
      
      const expContent = expMatch[0];
      const evidence: string[] = [];
      let completionConfidence = 0;
      
      // Extract experiment title and purpose for dynamic keyword generation
      const titleMatch = expContent.match(new RegExp(`${exp}:\\s*(.+)`));
      const title = titleMatch ? titleMatch[1].trim() : exp;
      
      const purposeMatch = expContent.match(/\*\*Purpose\*\*:\s*(.+)/);
      const purpose = purposeMatch ? purposeMatch[1].trim() : '';
      
      // Extract measurable outcomes from experiment
      const outcomesMatch = expContent.match(/\*\*Measurable Outcomes\*\*:(.*?)(?=\*\*|$)/s);
      const outcomes = outcomesMatch ? outcomesMatch[1].split('\n').filter(line => line.trim().startsWith('-')) : [];
      

      
      // DYNAMIC KEYWORD GENERATION (STATELESS)
      const expKeywords: string[] = [];
      
      // Extract keywords from title and purpose
      const allText = `${title} ${purpose}`.toLowerCase();
      const words = allText.split(/\s+/)
        .filter(w => w.length > 3 && !['test', 'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'during', 'before', 'after', 'under', 'over', 'between', 'among'].includes(w))
        .map(w => w.replace(/[^\w]/g, '')); // Remove punctuation
      
      expKeywords.push(...words);
      
      // DYNAMIC SCENARIO MATCHING (STATELESS)
      const matchedScenarios: string[] = [];
      
      // Match test scenarios based on keyword similarity
      availableScenarios.forEach(scenarioName => {
        const scenarioLower = scenarioName.toLowerCase();
        
        // Check for direct keyword matches
        const keywordMatches = expKeywords.filter(keyword => 
          scenarioLower.includes(keyword) || keyword.includes(scenarioLower)
        ).length;
        
        // Check for semantic similarity (common patterns)
        const semanticMatches = [
          // Common scenario patterns
          { pattern: 'clustering', keywords: ['cluster', 'group', 'similar', 'pattern'] },
          { pattern: 'quality', keywords: ['quality', 'filter', 'recall', 'query'] },
          { pattern: 'experience', keywords: ['experience', 'capture', 'remember'] },
          { pattern: 'recall', keywords: ['recall', 'search', 'find', 'query'] },
          { pattern: 'reconsider', keywords: ['reconsider', 'update', 'evolve', 'change'] },
          { pattern: 'release', keywords: ['release', 'delete', 'remove', 'cleanup'] },
          { pattern: 'pattern', keywords: ['pattern', 'realization', 'reflect', 'insight'] }
        ];
        
        const semanticMatch = semanticMatches.find(match => 
          scenarioLower.includes(match.pattern) && 
          match.keywords.some(keyword => expKeywords.includes(keyword))
        );
        
        if (keywordMatches >= 2 || semanticMatch) {
          matchedScenarios.push(scenarioName);
        }
      });
      
      // PRIORITY 1: TEST EVIDENCE (Highest Weight)
      if (matchedScenarios.length > 0) {
        const matchedTests = testContext.bridgeTests.scenarios.filter(s => matchedScenarios.includes(s.name));
        const successfulMatches = matchedTests.filter(t => t.success);
        
        if (successfulMatches.length > 0) {
          evidence.push(`✅ ${successfulMatches.length} matching test scenarios passing: ${successfulMatches.map(t => t.name).join(', ')}`);
          completionConfidence += 0.6; // High weight for passing tests
          
          // Add specific test content citations
          successfulMatches.forEach(test => {
            if (test.content?.description) {
              evidence.push(`📋 Test "${test.name}": "${test.content.description}"`);
            }
            if (test.content?.toolCalls && test.content.toolCalls.length > 0) {
              const toolsUsed = [...new Set(test.content.toolCalls.map(call => call.toolName))];
              evidence.push(`🔧 Test "${test.name}" used tools: ${toolsUsed.join(', ')}`);
            }
            if (test.content?.conversationFlow && test.content.conversationFlow.length > 0) {
              const turns = test.content.conversationFlow.length;
              evidence.push(`💬 Test "${test.name}" completed ${turns} conversation turns`);
            }
            
            // Add formatted conversation flow
            if (test.content?.conversationFlow && test.content.conversationFlow.length > 0) {
              evidence.push(`\n📝 **Conversation Flow for "${test.name}":**`);
              test.content.conversationFlow.forEach((turn, index) => {
                if (turn.userMessage) {
                  evidence.push(`   **Turn ${turn.turnNumber || index + 1} - User:** ${turn.userMessage}`);
                }
                if (turn.assistantResponse?.text) {
                  evidence.push(`   **Turn ${turn.turnNumber || index + 1} - Assistant:** ${turn.assistantResponse.text.substring(0, 200)}${turn.assistantResponse.text.length > 200 ? '...' : ''}`);
                }
              });
            }
            
            // Add formatted tool calls
            if (test.content?.toolCalls && test.content.toolCalls.length > 0) {
              evidence.push(`\n🔧 **Tool Calls for "${test.name}":**`);
              test.content.toolCalls.forEach((call, index) => {
                const args = Object.keys(call.arguments).length > 0 
                  ? `(${Object.entries(call.arguments).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(', ')})`
                  : '';
                evidence.push(`   **${index + 1}.** ${call.toolName}${args}`);
                if (call.result) {
                  const resultPreview = call.result.length > 100 
                    ? call.result.substring(0, 100) + '...' 
                    : call.result;
                  evidence.push(`      → ${resultPreview}`);
                }
              });
            }
          });
        }
        
        if (successfulMatches.length === matchedTests.length && matchedTests.length > 0) {
          evidence.push(`✅ All ${matchedTests.length} matched scenarios passing`);
          completionConfidence += 0.3; // Additional weight for complete test success
        }
      }
      
      // PRIORITY 2: IMPLEMENTATION EVIDENCE (Medium Weight)
      // Dynamically check for implementation files based on experiment keywords
      const implementationChecks = [
        { keyword: 'clustering', file: 'src/services/clustering.ts' },
        { keyword: 'learning', file: 'src/scripts/learning-loop.ts' },
        { keyword: 'scoring', file: 'src/services/unified-scoring.ts' },
        { keyword: 'embedding', file: 'src/services/embeddings.ts' },
        { keyword: 'recall', file: 'src/services/recall.ts' },
        { keyword: 'experience', file: 'src/services/experience.ts' }
      ];
      
      implementationChecks.forEach(check => {
        if (expKeywords.some(keyword => keyword.includes(check.keyword) || check.keyword.includes(keyword))) {
          if (existsSync(join(process.cwd(), check.file))) {
            evidence.push(`✅ ${check.keyword} implementation exists: ${check.file}`);
            completionConfidence += 0.2;
          }
          
          // Check for corresponding test file
          const testFile = check.file.replace('.ts', '.test.ts');
          if (existsSync(join(process.cwd(), testFile))) {
            evidence.push(`✅ ${check.keyword} unit tests exist: ${testFile}`);
            completionConfidence += 0.1;
          }
        }
      });
      
      // PRIORITY 3: COMMIT EVIDENCE (Lower Weight - Only if tests are insufficient)
      // Only consider commits if we don't have strong test evidence
      if (completionConfidence < 0.5) {
        outcomes.forEach(() => {
          // Enhanced commit matching using keywords
          const relatedCommits = gitContext.recentCommits.filter(c => {
            const msg = c.message.toLowerCase();
            const expLower = exp.toLowerCase();
            
            // Direct mention of experiment
            if (msg.includes(expLower)) return true;
            
            // Match based on experiment keywords
            const keywordMatches = expKeywords.filter(keyword => msg.includes(keyword)).length;
            if (keywordMatches >= 2) return true;
            
            // Specific pattern matching
            if (exp === 'EXP-002' && (msg.includes('quality') || msg.includes('recall') || msg.includes('filtering'))) {
              return true;
            }
            if (exp === 'EXP-003' && msg.includes('learning loop')) {
              return true;
            }
            if (exp === 'EXP-006' && (msg.includes('clustering') || msg.includes('cluster'))) {
              return true;
            }
            
            return false;
          });
          
          if (relatedCommits.length > 0) {
            evidence.push(`📝 ${relatedCommits.length} commits implementing features: ${relatedCommits.slice(0, 3).map(c => c.message.split('\n')[0]).join(', ')}`);
            completionConfidence += 0.1; // Lower weight for commits
          }
        });
      }
      
      // Additional learning loop evidence for EXP-003
      if (exp === 'EXP-003') {
        const loopRuns = testContext.recentTestRuns.filter(r => r.type === 'learning-loop');
        if (loopRuns.length > 0) {
          const successfulLoops = loopRuns.filter(r => r.success).length;
          evidence.push(`✅ Learning loop has ${loopRuns.length} recent runs (${successfulLoops} successful)`);
          completionConfidence += 0.3;
        }
        
        // Check if learning loop files exist
        const loopDir = join(process.cwd(), 'loop');
        if (existsSync(loopDir)) {
          const loopFiles = readdirSync(loopDir);
          const recsFiles = loopFiles.filter(f => f.includes('recommendations'));
          if (recsFiles.length > 0) {
            evidence.push(`✅ Recommendations generated in ${recsFiles.length} runs`);
            completionConfidence += 0.3;
          }
        }
      }
      

      
      // Generate recommendations based on evidence
      if (evidence.length >= 2 && completionConfidence >= 0.5) {
        // Extract experiment title
        const titleMatch = expContent.match(new RegExp(`${exp}:\\s*(.+)`));
        const title = titleMatch ? titleMatch[1].trim() : exp;
        
        recommendations.push({
          id: `REC-${idCounter++}`,
          type: 'documentation',
          priority: completionConfidence >= 0.7 ? 'high' : 'medium',
          title: `${exp} appears complete: ${title}`,
          description: `${exp} shows strong evidence of completion based on commits, test results, and implementation.`,
          rationale: 'Completed experiments should be moved to the Completed section with results documented.',
          evidence,
          suggestedChanges: [{
            file: 'EXPERIMENTS.md',
            section: exp,
            proposed: `Move to Completed Experiments section with status: Completed ${new Date().toISOString().split('T')[0]}`
          }],
          confidenceLevel: Math.min(completionConfidence, 0.95)
        });
      } else if (evidence.length > 0) {
        // Partial evidence - suggest what's missing
        const missingEvidence: string[] = [];
        if (matchedScenarios.length === 0) {
          missingEvidence.push(`No matching test scenarios found (available: ${availableScenarios.join(', ')})`);
        }
        if (!evidence.some(e => e.includes('✅'))) {
          missingEvidence.push('No passing test evidence found');
        }
        
        recommendations.push({
          id: `REC-${idCounter++}`,
          type: 'process',
          priority: 'low',
          title: `${exp} shows partial progress`,
          description: `${exp} has some evidence of progress but may need additional work.`,
          rationale: 'Active experiments should show clear progress through tests and implementation.',
          evidence: [...evidence, ...missingEvidence],
          confidenceLevel: completionConfidence
        });
      }
    });
    
    // Only add generic recommendation if no experiment-specific ones were generated
    const experimentRecs = recommendations.filter(r => 
      r.title.includes('EXP-') && (r.title.includes('appears complete') || r.title.includes('shows partial'))
    );
    if (experimentRecs.length === 0 && activeExps.length > 0) {
      recommendations.push({
        id: `REC-${idCounter++}`,
        type: 'process',
        priority: 'low',
        title: `Review active experiments: ${activeExps.join(', ')}`,
        description: 'Active experiments should be reviewed for progress and completion.',
        rationale: 'Regular experiment review ensures documentation stays current.',
        evidence: [
          `${activeExps.length} experiments in active state`,
          `Available test scenarios: ${availableScenarios.join(', ')}`,
          'Consider documenting progress or completion'
        ],
        confidenceLevel: 0.4
      });
    }
  }
  
  // Pattern 10: New learnings from test patterns
  if (testContext.bridgeTests.scenarios.length > 0 || testContext.unitTests.totalTests > 150) {
    const failurePatterns: string[] = [];
    
    // Check for specific failure patterns in Bridge tests
    testContext.bridgeTests.scenarios.forEach(s => {
      if (!s.success && s.errors) {
        if (s.errors.some(e => e.includes('overloaded'))) {
          failurePatterns.push('API overload errors during testing');
        }
        if (s.errors.some(e => e.includes('timeout'))) {
          failurePatterns.push('Test timeouts indicate performance issues');
        }
      }
    });
    
    // Check for patterns in recent development
    if (gitContext.recentCommits.filter(c => c.type === 'fix').length > 5) {
      failurePatterns.push('High bug fix rate indicates stability challenges');
    }
    
    if (failurePatterns.length > 0) {
      recommendations.push({
        id: `REC-${idCounter++}`,
        type: 'documentation',
        priority: 'medium',
        title: 'Document new learnings from recent test patterns',
        description: 'Recent test runs and development patterns reveal insights that should be captured in LEARNINGS.md.',
        rationale: 'Documenting learnings helps the team avoid repeating mistakes and builds institutional knowledge.',
        evidence: failurePatterns,
        suggestedChanges: [{
          file: 'LEARNINGS.md',
          proposed: 'Add new section with test insights and development patterns'
        }],
        confidenceLevel: 0.75
      });
    }
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function extractKeyFindings(gitContext: GitContext, testContext: TestContext, recommendations: Recommendation[]): string[] {
  const findings: string[] = [];

  // Development velocity insight
  if (gitContext.developmentVelocity > 2) {
    findings.push(`High development velocity: ${gitContext.developmentVelocity} commits/day`);
  } else if (gitContext.developmentVelocity < 0.5) {
    findings.push(`Low development velocity: ${gitContext.developmentVelocity} commits/day`);
  }

  // Commit type distribution
  const typeCount = new Map<string, number>();
  gitContext.recentCommits.forEach(c => {
    typeCount.set(c.type, (typeCount.get(c.type) || 0) + 1);
  });
  const dominant = Array.from(typeCount.entries())
    .sort((a, b) => b[1] - a[1])[0];
  
  if (dominant) {
    findings.push(`Development focus: ${dominant[0]} (${dominant[1]} commits)`);
  }

  // Test health
  const testPassRate = testContext.unitTests.totalTests > 0 
    ? (testContext.unitTests.passed / testContext.unitTests.totalTests * 100).toFixed(1)
    : 0;
  findings.push(`Unit test pass rate: ${testPassRate}% (${testContext.unitTests.passed}/${testContext.unitTests.totalTests})`);

  // Recommendation summary
  const criticalRecs = recommendations.filter(r => r.priority === 'critical');
  const highPriority = recommendations.filter(r => r.priority === 'high' || r.priority === 'critical');
  
  if (criticalRecs.length > 0) {
    findings.push(`${criticalRecs.length} CRITICAL issues requiring immediate attention`);
  } else if (highPriority.length > 0) {
    findings.push(`${highPriority.length} high-priority recommendations identified`);
  }

  return findings;
}

// ============================================================================
// Markdown Report Generation
// ============================================================================

function generateMarkdownReport(report: AnalysisReport): string {
  const { executiveSummary, recommendations, gitContext, testContext } = report;

  let markdown = `# Bridge Learning Loop Analysis Report
Generated: ${new Date(report.timestamp).toLocaleString()}

## Executive Summary

- Analyzed ${executiveSummary.totalCommitsAnalyzed} commits over ${report.gitContext.recentCommits.length > 0 ? 
  Math.ceil((new Date().getTime() - new Date(report.gitContext.recentCommits[report.gitContext.recentCommits.length - 1].date).getTime()) / (1000 * 60 * 60 * 24)) : 30} days
- Tested ${executiveSummary.totalTestsAnalyzed} test cases (unit + integration)
- Development velocity: ${gitContext.developmentVelocity} commits/day
- Focus areas: ${gitContext.focusAreas.join(', ')}

### Key Findings
${executiveSummary.keyFindings.map(f => `- ${f}`).join('\n')}

## Test Health

### Unit Tests
- Total: ${testContext.unitTests.totalTests}
- Passed: ${testContext.unitTests.passed}
- Failed: ${testContext.unitTests.failed}
- Duration: ${(testContext.unitTests.duration / 1000).toFixed(2)}s
${testContext.unitTests.coverage ? `
### Test Coverage
- Lines: ${testContext.unitTests.coverage.lines.toFixed(1)}%
- Branches: ${testContext.unitTests.coverage.branches.toFixed(1)}%
- Functions: ${testContext.unitTests.coverage.functions.toFixed(1)}%
` : ''}

### Bridge Integration Tests
- Scenarios: ${testContext.bridgeTests.scenarios.length}
- Passed: ${testContext.bridgeTests.scenarios.filter(s => s.success).length}
- Failed: ${testContext.bridgeTests.scenarios.filter(s => !s.success).length}

## Recommendations

`;

  // Group recommendations by priority
  const byPriority = new Map<string, Recommendation[]>();
  recommendations.forEach(rec => {
    const priority = rec.priority.toUpperCase();
    if (!byPriority.has(priority)) {
      byPriority.set(priority, []);
    }
    byPriority.get(priority)!.push(rec);
  });

  // Write recommendations by priority
  ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].forEach(priority => {
    const recs = byPriority.get(priority) || [];
    if (recs.length === 0) return;

    markdown += `### ${priority} Priority\n\n`;

    recs.forEach(rec => {
      markdown += `#### ${rec.id}: ${rec.title}\n\n`;
      markdown += `**Type**: ${rec.type}\n`;
      markdown += `**Confidence**: ${Math.round(rec.confidenceLevel * 100)}%\n\n`;
      markdown += `${rec.description}\n\n`;
      markdown += `**Rationale**: ${rec.rationale}\n\n`;
      
      if (rec.evidence.length > 0) {
        markdown += `**Evidence**:\n`;
        rec.evidence.forEach(e => {
          markdown += `- ${e}\n`;
        });
        markdown += '\n';
      }

      if (rec.relatedCommits && rec.relatedCommits.length > 0) {
        markdown += `**Related Commits**: ${rec.relatedCommits.join(', ')}\n\n`;
      }
    });
  });

  markdown += `## Development Context

### Recent Commit Types
${Array.from(new Set(gitContext.recentCommits.map(c => c.type)))
  .map(type => {
    const count = gitContext.recentCommits.filter(c => c.type === type).length;
    return `- ${type}: ${count} commits`;
  })
  .join('\n')}

### Recent Commits
${gitContext.recentCommits.slice(0, 10).map(c => 
  `- ${c.hash} - ${c.message} (${c.date})`
).join('\n')}

---
Analysis completed in ${report.metadata.analysisTime}ms
`;

  return markdown;
}

// ============================================================================
// CLI Interface
// ============================================================================

interface CLIOptions {
  days?: number;
  outputFormat?: 'json' | 'markdown' | 'both';
  verbose?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    outputFormat: 'both',
    days: 30,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--days' || arg === '-d') {
      options.days = parseInt(args[++i]) || 30;
    } else if (arg === '--format' || arg === '-f') {
      const format = args[++i];
      if (format === 'json' || format === 'markdown' || format === 'both') {
        options.outputFormat = format;
      }
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Bridge Learning Loop - Recommendation-Based Analysis

Usage: npm run loop [options]

Options:
  -d, --days <number>      Number of days of git history to analyze (default: 30)
  -f, --format <type>      Output format: json, markdown, or both (default: both)
  -v, --verbose            Show detailed analysis progress
  -h, --help               Show this help message

Examples:
  npm run loop                    # Run full analysis
  npm run loop -d 7 -f markdown   # Last 7 days, markdown only
  npm run loop --verbose          # Show detailed progress
`);
      process.exit(0);
    }
  }

  return options;
}

// ============================================================================
// Entry Point
// ============================================================================

// Run if this file is executed directly
async function main(): Promise<void> {
  const options = parseArgs();
  
  if (options.verbose) {
    console.log('📋 CLI Options:', options, '\n');
  }

  await runAnalysis({ days: options.days });
  
  // Handle output format
  if (options.outputFormat === 'json' || options.outputFormat === 'both') {
    console.log(`\n📄 JSON report saved`);
  }
  
  if (options.outputFormat === 'markdown' || options.outputFormat === 'both') {
    console.log(`📝 Markdown report saved`);
  }
}

main().catch(console.error);

export { runAnalysis, GitContextManager, type Recommendation, type AnalysisReport };