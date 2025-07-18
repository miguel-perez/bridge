#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

async function exportCaptainData(): Promise<void> {
  console.log('📤 Exporting Captain data for testing...');
  
  try {
    // Read the live bridge.json file
    const bridgePath = join(process.cwd(), 'bridge.json');
    const bridgeData = JSON.parse(readFileSync(bridgePath, 'utf-8'));
    
    // Filter for Captain experiences only
    const captainExperiences = bridgeData.sources.filter((source: any) => 
      source.experiencer === 'Captain (Miguel & Claude)' || 
      source.experiencer === 'Captain'
    );
    
    console.log(`📊 Found ${captainExperiences.length} Captain experiences out of ${bridgeData.sources.length} total`);
    
    // Create test data with Captain experiences
    const testData = {
      sources: captainExperiences,
      embeddings: [] // We'll regenerate embeddings during test
    };
    
    // Write to test file
    const testDataPath = join(process.cwd(), 'data', 'captain-test-data.json');
    writeFileSync(testDataPath, JSON.stringify(testData, null, 2));
    
    console.log(`✅ Captain data exported to: ${testDataPath}`);
    console.log(`📈 Sample experiences:`);
    
    // Show a few sample experiences
    captainExperiences.slice(0, 3).forEach((exp: any, i: number) => {
      console.log(`  ${i + 1}. ${exp.source.slice(0, 100)}...`);
    });
    
  } catch (error) {
    console.error('❌ Error exporting Captain data:', error);
    process.exit(1);
  }
}

// Run the export
exportCaptainData(); 