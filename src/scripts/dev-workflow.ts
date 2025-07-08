#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DevWorkflow {
  private projectRoot: string;

  constructor() {
    this.projectRoot = join(__dirname, '..', '..');
  }

  private runCommand(command: string, description: string): boolean {
    console.log(`\n🔧 ${description}...`);
    try {
      execSync(command, { 
        cwd: this.projectRoot, 
        stdio: 'inherit',
        env: { ...process.env, NODE_ENV: 'test' }
      });
      console.log(`✅ ${description} completed successfully`);
      return true;
    } catch (error) {
      console.error(`❌ ${description} failed:`, error);
      return false;
    }
  }

  async quickValidation(): Promise<boolean> {
    console.log('🚀 Starting quick validation workflow...\n');
    
    // Step 1: Build the project
    const buildSuccess = this.runCommand('npm run build', 'Building project');
    if (!buildSuccess) {
      console.log('❌ Build failed - stopping workflow');
      return false;
    }

    // Step 2: Run critical unit tests
    const unitTestSuccess = this.runCommand('npm test -- --testPathPattern="(capture-validation|mcp-compliance)"', 'Running critical unit tests');
    if (!unitTestSuccess) {
      console.log('❌ Unit tests failed - stopping workflow');
      return false;
    }

    // Step 3: Quick LLM integration test
    console.log('\n🧠 Running quick LLM integration test...');
    const llmSuccess = this.runCommand('npm run test:llm:scenario tool-discovery', 'Running tool discovery test');
    
    if (!llmSuccess) {
      console.log('⚠️ LLM test failed - but continuing (may be API issues)');
    }

    console.log('\n🎉 Quick validation completed!');
    return true;
  }

  async fullValidation(): Promise<boolean> {
    console.log('🚀 Starting full validation workflow...\n');
    
    // Step 1: Build the project
    const buildSuccess = this.runCommand('npm run build', 'Building project');
    if (!buildSuccess) {
      console.log('❌ Build failed - stopping workflow');
      return false;
    }

    // Step 2: Run all unit tests
    const unitTestSuccess = this.runCommand('npm test', 'Running all unit tests');
    if (!unitTestSuccess) {
      console.log('❌ Unit tests failed - stopping workflow');
      return false;
    }

    // Step 3: Run comprehensive LLM integration tests
    console.log('\n🧠 Running comprehensive LLM integration tests...');
    const llmSuccess = this.runCommand('npm run test:llm:scenario all', 'Running all LLM test scenarios');
    
    if (!llmSuccess) {
      console.log('⚠️ Some LLM tests failed - check results above');
    }

    console.log('\n🎉 Full validation completed!');
    return true;
  }

  async iterativeTest(scenario?: string): Promise<boolean> {
    console.log('🚀 Starting iterative test workflow...\n');
    
    // Step 1: Quick build
    const buildSuccess = this.runCommand('npm run build', 'Building project');
    if (!buildSuccess) {
      console.log('❌ Build failed - stopping workflow');
      return false;
    }

    // Step 2: Run specific LLM test scenario
    const testScenario = scenario || 'basic-capture';
    console.log(`\n🧠 Running iterative test: ${testScenario}`);
    const llmSuccess = this.runCommand(`npm run test:llm:scenario ${testScenario}`, `Running ${testScenario} test`);
    
    if (!llmSuccess) {
      console.log('❌ LLM test failed');
      return false;
    }

    console.log('\n🎉 Iterative test completed!');
    return true;
  }

  showHelp(): void {
    console.log(`
🚀 Bridge MCP Development Workflow

Usage:
  tsx src/scripts/dev-workflow.ts [command] [options]

Commands:
  quick          Run quick validation (build + critical tests + basic LLM test)
  full           Run full validation (build + all tests + all LLM scenarios)
  iterative      Run iterative test with specific scenario
  help           Show this help message

Options for iterative:
  --scenario     Specify LLM test scenario (default: basic-capture)
                Available scenarios: tool-discovery, basic-capture, basic-search, 
                capture-search-enrich, error-testing, full-integration

Examples:
  tsx src/scripts/dev-workflow.ts quick
  tsx src/scripts/dev-workflow.ts full
  tsx src/scripts/dev-workflow.ts iterative --scenario basic-search
  tsx src/scripts/dev-workflow.ts iterative --scenario capture-search-enrich

Workflow Description:
  - quick: Fast feedback during active development
  - full: Comprehensive validation before commits/releases
  - iterative: Test specific functionality during feature development
`);
  }
}

async function main() {
  const workflow = new DevWorkflow();
  const command = process.argv[2];
  const scenario = process.argv[3] === '--scenario' ? process.argv[4] : undefined;

  switch (command) {
    case 'quick':
      await workflow.quickValidation();
      break;
    case 'full':
      await workflow.fullValidation();
      break;
    case 'iterative':
      await workflow.iterativeTest(scenario);
      break;
    case 'help':
    case '--help':
    case '-h':
    case undefined:
      workflow.showHelp();
      break;
    default:
      console.log(`❌ Unknown command: ${command}`);
      workflow.showHelp();
      process.exit(1);
  }
}

// Run the workflow
main().catch(error => {
  console.error('💥 Workflow failed:', error);
  process.exit(1);
}); 