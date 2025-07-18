#!/usr/bin/env tsx
/**
 * Organize Test Results Script
 * 
 * Reorganizes the test-results directory into a cleaner structure
 * Run with: npm run organize:results
 */

import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from 'fs';
import { join } from 'path';

class TestResultsOrganizer {
  private resultsDir: string;
  private dryRun: boolean;
  
  constructor(dryRun: boolean = false) {
    this.resultsDir = join(process.cwd(), 'test-results');
    this.dryRun = dryRun;
  }
  
  organize(): void {
    console.log(`🗂️  Organizing test results... ${this.dryRun ? '(DRY RUN)' : ''}\n`);
    
    // Create directory structure
    this.createDirectories();
    
    // Move files to appropriate locations
    this.moveFiles();
    
    console.log('\n✅ Organization complete!');
    
    if (this.dryRun) {
      console.log('\n💡 This was a dry run. Run without --dry-run to actually move files.');
    }
  }
  
  private createDirectories(): void {
    const dirs = [
      'current',
      'scenarios',
      'scenarios/bridge-exploration',
      'scenarios/natural-remember', 
      'scenarios/pattern-discovery',
      'scenarios/claude-thinking',
      'reports',
      'archive'
    ];
    
    dirs.forEach(dir => {
      const path = join(this.resultsDir, dir);
      if (!existsSync(path)) {
        console.log(`📁 Creating directory: ${dir}`);
        if (!this.dryRun) {
          mkdirSync(path, { recursive: true });
        }
      }
    });
  }
  
  private moveFiles(): void {
    const files = readdirSync(this.resultsDir);
    
    files.forEach(file => {
      const filePath = join(this.resultsDir, file);
      
      // Skip if it's a directory
      if (statSync(filePath).isDirectory()) {
        return;
      }
      
      let targetDir: string | null = null;
      
      // Determine target directory based on file type
      if (file === 'DASHBOARD.md' || file === 'progression-tracking.json') {
        targetDir = 'current';
      } else if (file.startsWith('trend-report-')) {
        targetDir = 'reports';
      } else if (file === 'README.md') {
        // Keep README at root
        return;
      } else {
        // Scenario test results
        const scenarios = ['bridge-exploration', 'natural-remember', 'pattern-discovery', 'claude-thinking'];
        for (const scenario of scenarios) {
          if (file.startsWith(scenario)) {
            targetDir = `scenarios/${scenario}`;
            break;
          }
        }
      }
      
      if (targetDir) {
        const targetPath = join(this.resultsDir, targetDir, file);
        console.log(`📄 Moving ${file} → ${targetDir}/`);
        if (!this.dryRun) {
          renameSync(filePath, targetPath);
        }
      }
    });
  }
  
  // Future enhancement: Archive old files
  archiveOldFiles(daysOld: number = 30): void {
    console.log(`\n📦 Archiving files older than ${daysOld} days...\n`);
    
    const scenarios = ['bridge-exploration', 'natural-remember', 'pattern-discovery', 'claude-thinking'];
    const now = Date.now();
    const ageLimit = daysOld * 24 * 60 * 60 * 1000;
    
    scenarios.forEach(scenario => {
      const scenarioDir = join(this.resultsDir, 'scenarios', scenario);
      if (!existsSync(scenarioDir)) return;
      
      const files = readdirSync(scenarioDir);
      files.forEach(file => {
        const filePath = join(scenarioDir, file);
        const stats = statSync(filePath);
        const age = now - stats.mtime.getTime();
        
        if (age > ageLimit) {
          const archivePath = join(this.resultsDir, 'archive', file);
          console.log(`📦 Archiving ${scenario}/${file}`);
          if (!this.dryRun) {
            renameSync(filePath, archivePath);
          }
        }
      });
    });
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes('--dry-run');
  const organizer = new TestResultsOrganizer(dryRun);
  
  try {
    organizer.organize();
    
    // Optionally archive old files
    if (process.argv.includes('--archive')) {
      organizer.archiveOldFiles();
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

export { TestResultsOrganizer };