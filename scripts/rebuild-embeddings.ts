#!/usr/bin/env ts-node
import { getAllRecords } from '../src/storage.js';
import { generateEmbedding, saveEmbeddings } from '../src/embeddings.js';

async function main() {
  console.log('Rebuilding all embeddings from storage...');
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