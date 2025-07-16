#!/usr/bin/env tsx
/**
 * Cleanup script to remove VectorStore usage from Bridge
 * 
 * This script:
 * 1. Removes all VectorStore imports and usage
 * 2. Updates services to use consolidated storage
 * 3. Removes the separate .vectors.json files
 * 4. Ensures embeddings are only stored in the main bridge.json
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

interface FileChanges {
  remove?: string[];
  replace?: Record<string, string>;
}

// Files that need to be updated
const FILES_TO_UPDATE: Record<string, FileChanges> = {
  'src/services/capture.ts': {
    remove: [
      "import { VectorStore } from './vector-store.js';",
      "const vectorStore = new VectorStore();",
      "await vectorStore.initialize();",
      "await vectorStore.addVector(savedSource.id, embedding);",
      "await vectorStore.saveToDisk();"
    ]
  },
  'src/services/enrich.ts': {
    remove: [
      "import { getVectorStore } from './vector-store.js';",
      "await getVectorStore().removeVector(input.id);",
      "await getVectorStore().addVector(source.id, embedding);"
    ]
  },
  'src/services/search.ts': {
    remove: [
      "import { VectorStore } from './vector-store.js';",
      "private vectorStore: VectorStore;",
      "this.vectorStore = new VectorStore();",
      "await this.vectorStore.initialize();",
      // Remove vector similarity scoring
    ],
    replace: {
      "const vectorSimilarity = await this.getVectorSimilarity(queryEmbedding, source);": "const vectorSimilarity = 0; // Vector similarity removed",
      "private async getVectorSimilarity(queryEmbedding: number[], source: Source): Promise<number> {": "// Vector similarity method removed"
    }
  },
  'src/mcp/server.ts': {
    remove: [
      "import { VectorStore } from '../services/vector-store.js';",
      "const vectorStore = new VectorStore();",
      "await vectorStore.initialize();"
    ]
  },
  'src/mcp/release-handler.ts': {
    remove: [
      "import { VectorStore } from '../services/vector-store.js';",
      "const vectorStore = new VectorStore();",
      "await vectorStore.removeVector(id);",
      "await vectorStore.saveToDisk();"
    ]
  },
  'src/core/search.ts': {
    remove: [
      "import { VectorStore } from '../services/vector-store.js';"
    ]
  }
};

// Files to be deleted
const FILES_TO_DELETE = [
  'src/services/vector-store.ts',
  'src/services/vector-store.test.ts',
  'src/services/consolidated-vector-store.ts' // This appears to be unused
];

async function cleanupVectorStore(): Promise<void> {
  console.log('🧹 Starting VectorStore cleanup...\n');

  // Step 1: Update source files
  console.log('📝 Updating source files...');
  for (const [filePath, changes] of Object.entries(FILES_TO_UPDATE)) {
    const fullPath = join(process.cwd(), filePath);
    
    if (!existsSync(fullPath)) {
      console.log(`⚠️  Skipping ${filePath} (not found)`);
      continue;
    }

    let content = readFileSync(fullPath, 'utf-8');
    let modified = false;

    // Remove lines
    if (changes.remove) {
      for (const lineToRemove of changes.remove) {
        if (content.includes(lineToRemove)) {
          content = content.replace(lineToRemove, '');
          modified = true;
        }
      }
    }

    // Replace content
    if (changes.replace) {
      for (const [search, replace] of Object.entries(changes.replace)) {
        if (content.includes(search)) {
          content = content.replace(search, replace);
          modified = true;
        }
      }
    }

    // Clean up extra newlines
    content = content.replace(/\n\n\n+/g, '\n\n');

    if (modified) {
      writeFileSync(fullPath, content);
      console.log(`✅ Updated ${filePath}`);
    } else {
      console.log(`⏭️  No changes needed in ${filePath}`);
    }
  }

  // Step 2: Update test setup
  console.log('\n📝 Updating test setup...');
  const testSetupPath = join(process.cwd(), 'src/test-setup.ts');
  if (existsSync(testSetupPath)) {
    let content = readFileSync(testSetupPath, 'utf-8');
    
    // Remove VectorStore mock
    const vectorStoreMockStart = content.indexOf("jest.mock('./services/vector-store'");
    if (vectorStoreMockStart !== -1) {
      const vectorStoreMockEnd = content.indexOf('});', vectorStoreMockStart) + 3;
      content = content.substring(0, vectorStoreMockStart) + content.substring(vectorStoreMockEnd);
      writeFileSync(testSetupPath, content);
      console.log('✅ Removed VectorStore mock from test setup');
    }
  }

  // Step 3: Delete vector store files
  console.log('\n🗑️  Deleting vector store files...');
  for (const file of FILES_TO_DELETE) {
    const fullPath = join(process.cwd(), file);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
      console.log(`✅ Deleted ${file}`);
    } else {
      console.log(`⏭️  ${file} not found`);
    }
  }

  // Step 4: Clean up .vectors.json files
  console.log('\n🗑️  Cleaning up .vectors.json files...');
  const vectorFiles: string[] = [];
  
  // Simple recursive function to find .vectors.json files
  function findVectorFiles(dir: string, baseDir: string = dir): void {
    if (dir.includes('node_modules')) return;
    
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        findVectorFiles(fullPath, baseDir);
      } else if (entry.endsWith('.vectors.json')) {
        vectorFiles.push(fullPath.replace(baseDir + '/', ''));
      }
    }
  }
  
  findVectorFiles(process.cwd());

  for (const file of vectorFiles) {
    unlinkSync(join(process.cwd(), file));
    console.log(`✅ Deleted ${file}`);
  }

  // Step 5: Update capture.ts to remove VectorStore completely
  console.log('\n📝 Final cleanup of capture.ts...');
  const capturePath = join(process.cwd(), 'src/services/capture.ts');
  let captureContent = readFileSync(capturePath, 'utf-8');
  
  // Remove the entire VectorStore block in captureSource method
  const vectorStoreBlockRegex = /\/\/ Save to vector store for backward compatibility[\s\S]*?return { source: savedSource, defaultsUsed };/;
  captureContent = captureContent.replace(vectorStoreBlockRegex, 'return { source: savedSource, defaultsUsed };');
  
  writeFileSync(capturePath, captureContent);

  // Step 6: Update enrich.ts to remove VectorStore completely
  console.log('\n📝 Final cleanup of enrich.ts...');
  const enrichPath = join(process.cwd(), 'src/services/enrich.ts');
  let enrichContent = readFileSync(enrichPath, 'utf-8');
  
  // Remove the VectorStore update block
  const vectorStoreUpdateRegex = /\/\/ Update vector store for backward compatibility[\s\S]*?} catch \(error\) {[\s\S]*?}/;
  enrichContent = enrichContent.replace(vectorStoreUpdateRegex, '');
  
  writeFileSync(enrichPath, enrichContent);

  console.log('\n✅ VectorStore cleanup completed!');
  console.log('\n📋 Summary:');
  console.log('- Removed VectorStore imports and usage from all services');
  console.log('- Deleted vector-store.ts and related files');
  console.log(`- Cleaned up ${vectorFiles.length} .vectors.json files`);
  console.log('- Embeddings are now only stored in the main bridge.json file');
  console.log('\n⚠️  Note: You should rebuild the project and run tests to ensure everything works correctly.');
}

// Run the cleanup
cleanupVectorStore().catch(error => {
  console.error('💥 Cleanup failed:', error);
  process.exit(1);
});