#!/usr/bin/env node
/**
 * Script to fix missing created timestamps in migrated data
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

function extractTimestampFromContext(context: string): string | null {
  // Look for ISO timestamp pattern in context
  const isoMatch = context.match(/(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
  if (isoMatch) {
    return isoMatch[1];
  }
  
  // Look for date pattern and convert to ISO
  const dateMatch = context.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    return `${dateMatch[1]}T00:00:00.000Z`;
  }
  
  // Look for "today" and use current date
  if (context.includes('today')) {
    return new Date().toISOString();
  }
  
  return null;
}

function fixTimestamps() {
  const inputPath = join(projectRoot, 'data/migration/migrated-improved.bridge.json');
  const outputPath = join(projectRoot, 'data/migration/migrated-fixed.bridge.json');
  
  const data = JSON.parse(readFileSync(inputPath, 'utf8'));
  let fixedCount = 0;
  let missingCount = 0;
  
  console.log('🔧 Fixing missing timestamps...\n');
  
  for (const source of data.sources) {
    if (!source.created) {
      const timestamp = extractTimestampFromContext(source.context || '');
      if (timestamp) {
        source.created = timestamp;
        fixedCount++;
      } else {
        // Use a default timestamp if we can't extract one
        source.created = '2025-07-06T22:39:21.202Z';
        missingCount++;
      }
    }
  }
  
  console.log(`✅ Fixed timestamps: ${fixedCount}`);
  console.log(`⚠️  Used default timestamps: ${missingCount}`);
  console.log(`📊 Total sources: ${data.sources.length}`);
  
  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`\n💾 Fixed data written to ${outputPath}`);
}

fixTimestamps(); 