#!/usr/bin/env tsx
import path from 'path';
import { getAllRecords, setStorageConfig } from '../src/storage.js';

const defaultDataPath = path.resolve(process.cwd(), 'bridge.json');
const DATA_FILE_PATH = process.env.BRIDGE_FILE_PATH
  ? path.isAbsolute(process.env.BRIDGE_FILE_PATH)
    ? process.env.BRIDGE_FILE_PATH
    : path.resolve(process.cwd(), process.env.BRIDGE_FILE_PATH)
  : defaultDataPath;

setStorageConfig({ dataFile: DATA_FILE_PATH });

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
  const { updateRecordEmbedding } = await import('../src/embeddings.js');
  let count = 0;
  for (const record of records) {
    await updateRecordEmbedding(record);
    count++;
    if (count % 10 === 0) console.log(`  Upserted ${count} embeddings to Pinecone...`);
  }
  console.log(`Done. Upserted ${count} embeddings to Pinecone.`);
}

main().catch((err) => {
  console.error('Error rebuilding embeddings:', err);
  process.exit(1);
}); 