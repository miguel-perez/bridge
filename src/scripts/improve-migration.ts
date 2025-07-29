#!/usr/bin/env node
/**
 * Script to improve migrated data context and emoji selection
 * Based on the person's authentic voice and Bridge philosophy guidelines
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

interface MigratedSource {
  id: string;
  source: string;
  emoji: string;
  created: string;
  who?: string | string[];
  experience?: string[];
  experienceQualities?: Record<string, string | false>;
  context: string;
}

interface ImprovedSource extends MigratedSource {
  improvedContext: string;
  improvedEmoji: string;
}

// Emoji mapping based on content patterns and authentic voice
const EMOJI_MAPPING = {
  // Vulnerable/emotional moments
  'overwhelm': '😔',
  'anxiety': '😔', 
  'cry': '😔',
  'tears': '😔',
  'overstimulated': '😔',
  'vulnerable': '😔',
  
  // Poetic/creative moments
  'poem': '✨',
  'write': '✨',
  'creative': '✨',
  'poetry': '✨',
  'magic': '✨',
  
  // Self-love/encouragement
  'parenting': '💝',
  'encourage': '💝',
  'love': '💝',
  'okay': '💝',
  
  // Strength/determination
  'discipline': '🎯',
  'focus': '🎯',
  'goal': '🎯',
  'determined': '🎯',
  
  // Professional/work
  'successfully': '💼',
  'facilitated': '💼',
  'presentation': '💼',
  'conference': '💼',
  'professional': '💼',
  
  // Presence/awareness
  'present': '💝',
  'aware': '💝',
  'breath': '💝',
  
  // Time/reflection
  'time': '⏰',
  'reflect': '⏰',
  'moment': '⏰',
  
  // Default for unclear cases
  'default': '💪'
};

// Context improvement patterns
const CONTEXT_PATTERNS = {
  // Conference/overwhelm moments
  'conference.*overstimulated': 'At a conference, feeling raw and exposed.',
  'conference.*anxiety': 'At a conference, feeling socially anxious.',
  
  // Poetic moments
  'poem': 'A crafted poem.',
  'write.*poem': 'A crafted poem about writing.',
  
  // Self-parenting
  'parenting.*myself': 'A crafted self-parenting moment of encouragement and love.',
  
  // Professional moments
  'successfully.*created': 'Professional development work.',
  'facilitated.*meeting': 'Professional facilitation work.',
  'presentation.*team': 'Professional development presentation.',
  
  // Reflective moments
  'discipline': 'A reflective moment about self-discipline and personal growth.',
  'focus.*attention': 'A moment of focused attention and clarity.',
  
  // Presence moments
  'present.*moment': 'A moment of presence and awareness.',
  'breath.*aware': 'A moment of mindful breathing and awareness.',
  
  // Default
  'default': 'A captured moment.'
};

function determineEmoji(source: string): string {
  const lowerSource = source.toLowerCase();
  
  // Check for specific patterns
  for (const [pattern, emoji] of Object.entries(EMOJI_MAPPING)) {
    if (pattern !== 'default' && lowerSource.includes(pattern)) {
      return emoji;
    }
  }
  
  return EMOJI_MAPPING.default;
}

function improveContext(source: string, originalContext: string): string {
  const lowerSource = source.toLowerCase();
  
  // Check for specific patterns
  for (const [pattern, improvedContext] of Object.entries(CONTEXT_PATTERNS)) {
    if (pattern !== 'default' && lowerSource.includes(pattern)) {
      return improvedContext;
    }
  }
  
  // Extract date from original context if available
  const dateMatch = originalContext.match(/(\d{4}-\d{2}-\d{2}|\d{4}-\d{2})/);
  const date = dateMatch ? dateMatch[1] : '';
  
  // Determine type of moment
  if (lowerSource.includes('**')) {
    return `A crafted moment.${date ? ` ${date}.` : ''}`;
  }
  
  if (lowerSource.includes('poem') || lowerSource.includes('write')) {
    return `A poetic moment.${date ? ` ${date}.` : ''}`;
  }
  
  if (lowerSource.includes('cry') || lowerSource.includes('tears') || lowerSource.includes('overwhelm')) {
    return `A vulnerable moment.${date ? ` ${date}.` : ''}`;
  }
  
  return `A captured moment.${date ? ` ${date}.` : ''}`;
}

function improveMigration(): void {
  const inputPath = join(projectRoot, 'data/migration/migrated.bridge.json');
  const outputPath = join(projectRoot, 'data/migration/migrated-improved.bridge.json');
  
  const data = JSON.parse(readFileSync(inputPath, 'utf8'));
  const improvedSources: ImprovedSource[] = [];
  
  console.log(`Improving ${data.sources.length} sources...`);
  
  for (const source of data.sources) {
    const improvedEmoji = determineEmoji(source.source);
    const improvedContext = improveContext(source.source, source.context);
    
    improvedSources.push({
      ...source,
      emoji: improvedEmoji,
      context: improvedContext
    });
  }
  
  // Count emoji distribution
  const emojiCounts: Record<string, number> = {};
  improvedSources.forEach(s => {
    emojiCounts[s.emoji] = (emojiCounts[s.emoji] || 0) + 1;
  });
  
  console.log('\nEmoji distribution:');
  Object.entries(emojiCounts)
    .sort(([,a], [,b]) => b - a)
    .forEach(([emoji, count]) => {
      console.log(`  ${emoji}: ${count}`);
    });
  
  const improvedData = {
    ...data,
    sources: improvedSources
  };
  
  writeFileSync(outputPath, JSON.stringify(improvedData, null, 2));
  console.log(`\nImproved data written to ${outputPath}`);
}

improveMigration(); 