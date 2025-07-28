#!/usr/bin/env node

/**
 * Convert filtered conversation messages to Bridge experiences
 * Adds emoji selection and experiential quality analysis
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface FilteredMessage {
  id: string;
  text: string;
  sender: 'human' | 'assistant';
  timestamp: string;
  conversation_id: string;
  conversation_name: string;
}

interface BridgeExperience {
  id: string;
  source: string;
  emoji: string;
  created: string;
  who: string;
  experience?: string[];
  experienceQualities?: {
    embodied: string | false;
    focus: string | false;
    mood: string | false;
    purpose: string | false;
    space: string | false;
    time: string | false;
    presence: string | false;
  };
  context?: string;
}

interface ConversionStats {
  total_messages: number;
  converted_experiences: number;
  human_experiences: number;
  assistant_experiences: number;
  skipped_messages: number;
  emoji_distribution: Record<string, number>;
}

/**
 * Simple emoji selection based on content analysis
 */
function selectEmoji(text: string, sender: 'human' | 'assistant'): string {
  const lowerText = text.toLowerCase();
  
  // Emotional content
  if (lowerText.includes('anxious') || lowerText.includes('worried') || lowerText.includes('stress')) {
    return '😟';
  }
  if (lowerText.includes('happy') || lowerText.includes('excited') || lowerText.includes('joy')) {
    return '😊';
  }
  if (lowerText.includes('frustrated') || lowerText.includes('angry') || lowerText.includes('mad')) {
    return '😤';
  }
  if (lowerText.includes('sad') || lowerText.includes('depressed') || lowerText.includes('cry')) {
    return '😔';
  }
  
  // Work/Productivity content
  if (lowerText.includes('work') || lowerText.includes('project') || lowerText.includes('task')) {
    return '💼';
  }
  if (lowerText.includes('code') || lowerText.includes('programming') || lowerText.includes('development')) {
    return '💻';
  }
  if (lowerText.includes('design') || lowerText.includes('ui') || lowerText.includes('ux')) {
    return '🎨';
  }
  
  // Learning/Insight content
  if (lowerText.includes('learn') || lowerText.includes('understand') || lowerText.includes('insight')) {
    return '💡';
  }
  if (lowerText.includes('think') || lowerText.includes('thought') || lowerText.includes('mind')) {
    return '🤔';
  }
  
  // Physical/Embodied content
  if (lowerText.includes('body') || lowerText.includes('physical') || lowerText.includes('feel')) {
    return '💪';
  }
  if (lowerText.includes('tired') || lowerText.includes('exhausted') || lowerText.includes('sleep')) {
    return '😴';
  }
  
  // Social/Relationship content
  if (lowerText.includes('family') || lowerText.includes('friend') || lowerText.includes('people')) {
    return '👥';
  }
  if (lowerText.includes('meeting') || lowerText.includes('conversation') || lowerText.includes('talk')) {
    return '🗣️';
  }
  
  // Creative content
  if (lowerText.includes('creative') || lowerText.includes('art') || lowerText.includes('write')) {
    return '✨';
  }
  if (lowerText.includes('music') || lowerText.includes('song') || lowerText.includes('rhythm')) {
    return '🎵';
  }
  
  // Time/Planning content
  if (lowerText.includes('future') || lowerText.includes('plan') || lowerText.includes('tomorrow')) {
    return '⏰';
  }
  if (lowerText.includes('past') || lowerText.includes('memory') || lowerText.includes('remember')) {
    return '📅';
  }
  
  // Default based on sender
  return sender === 'human' ? '🤔' : '💭';
}

/**
 * Simple quality detection based on content keywords
 */
function detectQualities(text: string): string[] {
  const lowerText = text.toLowerCase();
  const qualities: string[] = [];
  
  // Embodied qualities
  if (lowerText.includes('think') || lowerText.includes('mind') || lowerText.includes('brain')) {
    qualities.push('embodied.thinking');
  }
  if (lowerText.includes('feel') || lowerText.includes('body') || lowerText.includes('physical')) {
    qualities.push('embodied.sensing');
  }
  
  // Focus qualities
  if (lowerText.includes('focus') || lowerText.includes('concentrate') || lowerText.includes('specific')) {
    qualities.push('focus.narrow');
  }
  if (lowerText.includes('broad') || lowerText.includes('scattered') || lowerText.includes('multiple')) {
    qualities.push('focus.broad');
  }
  
  // Mood qualities
  if (lowerText.includes('open') || lowerText.includes('curious') || lowerText.includes('wonder')) {
    qualities.push('mood.open');
  }
  if (lowerText.includes('closed') || lowerText.includes('frustrated') || lowerText.includes('angry')) {
    qualities.push('mood.closed');
  }
  
  // Purpose qualities
  if (lowerText.includes('goal') || lowerText.includes('target') || lowerText.includes('achieve')) {
    qualities.push('purpose.goal');
  }
  if (lowerText.includes('explore') || lowerText.includes('wander') || lowerText.includes('discover')) {
    qualities.push('purpose.wander');
  }
  
  // Space qualities
  if (lowerText.includes('here') || lowerText.includes('present') || lowerText.includes('now')) {
    qualities.push('space.here');
  }
  if (lowerText.includes('there') || lowerText.includes('away') || lowerText.includes('distant')) {
    qualities.push('space.there');
  }
  
  // Time qualities
  if (lowerText.includes('past') || lowerText.includes('memory') || lowerText.includes('remember')) {
    qualities.push('time.past');
  }
  if (lowerText.includes('future') || lowerText.includes('plan') || lowerText.includes('tomorrow')) {
    qualities.push('time.future');
  }
  
  // Presence qualities
  if (lowerText.includes('alone') || lowerText.includes('individual') || lowerText.includes('solo')) {
    qualities.push('presence.individual');
  }
  if (lowerText.includes('together') || lowerText.includes('team') || lowerText.includes('group')) {
    qualities.push('presence.collective');
  }
  
  return qualities;
}

/**
 * Convert filtered messages to Bridge experiences
 */
function convertToExperiences(messages: FilteredMessage[]): {
  experiences: BridgeExperience[];
  stats: ConversionStats;
} {
  const experiences: BridgeExperience[] = [];
  const stats: ConversionStats = {
    total_messages: messages.length,
    converted_experiences: 0,
    human_experiences: 0,
    assistant_experiences: 0,
    skipped_messages: 0,
    emoji_distribution: {}
  };

  for (const message of messages) {
    // Skip very short messages
    if (message.text.length < 20) {
      stats.skipped_messages++;
      continue;
    }
    
    // Skip messages that are just lists or summaries
    const lowerText = message.text.toLowerCase();
    if (lowerText.startsWith('here\'s') || 
        lowerText.startsWith('summary') ||
        lowerText.includes('1.') && lowerText.includes('2.') ||
        lowerText.includes('•') && lowerText.includes('•')) {
      stats.skipped_messages++;
      continue;
    }

    // Select emoji
    const emoji = selectEmoji(message.text, message.sender);
    stats.emoji_distribution[emoji] = (stats.emoji_distribution[emoji] || 0) + 1;

    // Detect qualities
    const qualities = detectQualities(message.text);

    // Create Bridge experience
    const experience: BridgeExperience = {
      id: message.id,
      source: message.text,
      emoji,
      created: message.timestamp,
      who: message.sender === 'human' ? 'Miguel' : 'Claude',
      experience: qualities.length > 0 ? qualities : undefined,
      context: `From conversation: ${message.conversation_name}`
    };

    experiences.push(experience);
    stats.converted_experiences++;
    
    if (message.sender === 'human') {
      stats.human_experiences++;
    } else {
      stats.assistant_experiences++;
    }
  }

  return { experiences, stats };
}

/**
 * Main conversion function
 */
async function convertToBridgeExperiences(inputPath: string, outputPath: string): Promise<void> {
  console.log('🔄 Starting conversion to Bridge experiences...');
  
  try {
    // Read filtered messages
    console.log(`📖 Reading filtered messages: ${inputPath}`);
    const fileContent = readFileSync(inputPath, 'utf-8');
    const data = JSON.parse(fileContent);
    const messages: FilteredMessage[] = data.messages;
    
    console.log(`📊 Processing ${messages.length} filtered messages`);
    
    // Convert to experiences
    console.log('🔄 Converting to Bridge experiences...');
    const { experiences, stats } = convertToExperiences(messages);
    
    // Create Bridge storage format
    const bridgeData = {
      sources: experiences
    };
    
    // Write Bridge experiences
    console.log(`💾 Writing ${experiences.length} experiences to ${outputPath}`);
    writeFileSync(outputPath, JSON.stringify(bridgeData, null, 2));
    
    // Print summary
    console.log('\n📈 Conversion Summary:');
    console.log(`   Total messages: ${stats.total_messages}`);
    console.log(`   Converted experiences: ${stats.converted_experiences} (${Math.round(stats.converted_experiences / stats.total_messages * 100)}%)`);
    console.log(`   Human experiences: ${stats.human_experiences}`);
    console.log(`   Assistant experiences: ${stats.assistant_experiences}`);
    console.log(`   Skipped messages: ${stats.skipped_messages}`);
    
    console.log('\n🎯 Emoji Distribution:');
    Object.entries(stats.emoji_distribution)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([emoji, count]) => {
        console.log(`   ${emoji}: ${count}`);
      });
    
    console.log(`\n✅ Conversion complete! Output saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error during conversion:', error);
    throw error;
  }
}

// CLI interface
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const inputPath = process.argv[2] || 'data/migration/filtered-conversations.json';
  const outputPath = process.argv[3] || 'data/migration/bridge-experiences.json';
  
  convertToBridgeExperiences(inputPath, outputPath)
    .then(() => {
      console.log('🎉 Conversion completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Conversion failed:', error);
      process.exit(1);
    });
}

export { convertToBridgeExperiences };
export type { FilteredMessage, BridgeExperience, ConversionStats }; 