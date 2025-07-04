#!/usr/bin/env tsx
import path from 'path';
import { getAllRecords, setStorageConfig } from '../src/storage.js';
import { generateEmbedding, saveEmbeddings, setEmbeddingsConfig } from '../src/embeddings.js';

const defaultDataPath = path.resolve(process.cwd(), 'bridge.json');
const DATA_FILE_PATH = process.env.BRIDGE_FILE_PATH
  ? path.isAbsolute(process.env.BRIDGE_FILE_PATH)
    ? process.env.BRIDGE_FILE_PATH
    : path.resolve(process.cwd(), process.env.BRIDGE_FILE_PATH)
  : defaultDataPath;

setStorageConfig({ dataFile: DATA_FILE_PATH });
setEmbeddingsConfig({ dataFile: DATA_FILE_PATH });

// Try to import getDataFile for debug output
let dataFilePath: string | undefined = undefined;
try {
  // @ts-expect-error getDataFile may not be exported; dynamic import for debug only
  dataFilePath = (await import('../src/storage.js')).getDataFile?.();
} catch (err) {
  console.log('Could not import getDataFile from storage.js:', err);
}

async function main() {
  console.log('Rebuilding all embeddings from storage...');
  console.log('NODE_ENV:', process.env.NODE_ENV, 'BRIDGE_FILE_PATH:', process.env.BRIDGE_FILE_PATH);
  if (dataFilePath) {
    console.log('Using data file:', dataFilePath);
  } else {
    console.log('Data file path could not be determined programmatically.');
  }
  console.log('If this is not correct, set BRIDGE_FILE_PATH to your desired bridge.json path before running this script.');

  const records = await getAllRecords();
  const embeddings: Record<string, number[]> = {};
  let count = 0;
  for (const record of records) {
    const { getSearchableText } = await import('../src/storage.js');
    const text = getSearchableText(record);
    embeddings[record.id] = await generateEmbedding(text);
    count++;
    if (count % 10 === 0) console.log(`  Embedded ${count} records...`);
  }
  await saveEmbeddings(embeddings);
  console.log(`Done. Rebuilt embeddings for ${count} records.`);
}

main().catch((err) => {
  console.error('Error rebuilding embeddings:', err);
  process.exit(1);
}); 