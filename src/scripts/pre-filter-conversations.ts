#!/usr/bin/env node

/**
 * Pre-filtering script for conversation data import
 * Extracts meaningful conversation content from Claude Desktop export
 */

import { readFileSync, writeFileSync } from 'fs';

interface ConversationMessage {
  uuid: string;
  text: string;
  content: Array<{
    start_timestamp: string;
    stop_timestamp: string;
    type: string;
    text: string;
    citations: unknown[];
  }>;
  sender: 'human' | 'assistant';
  created_at: string;
  updated_at: string;
  attachments: unknown[];
  files: unknown[];
}

interface Conversation {
  uuid: string;
  name: string;
  created_at: string;
  updated_at: string;
  account: { uuid: string };
  chat_messages: ConversationMessage[];
}

interface FilteredMessage {
  id: string;
  text: string;
  sender: 'human' | 'assistant';
  timestamp: string;
  conversation_id: string;
  conversation_name: string;
  // Bridge-specific fields to be added later
  emoji?: string;
  experience?: string[];
  who?: string;
}

interface FilteringStats {
  total_conversations: number;
  total_messages: number;
  valid_messages: number;
  human_messages: number;
  assistant_messages: number;
  empty_messages: number;
  short_messages: number;
  long_messages: number;
  average_length: number;
}

/**
 * Filters out messages that are unlikely to be meaningful experiences
 */
function isValidExperienceMessage(message: ConversationMessage): boolean {
  // Skip empty messages
  if (!message.text || message.text.trim().length === 0) {
    return false;
  }

  // Skip very short messages (likely system messages)
  if (message.text.trim().length < 10) {
    return false;
  }

  // Skip very long messages (likely code blocks or large responses)
  if (message.text.length > 2000) {
    return false;
  }

  // Skip messages that are just commands or prompts
  const lowerText = message.text.toLowerCase();
  if (lowerText.startsWith('summarize') || 
      lowerText.startsWith('write') ||
      lowerText.startsWith('generate') ||
      lowerText.startsWith('create') ||
      lowerText.startsWith('analyze')) {
    return false;
  }

  // Skip messages that are just acknowledgments
  const acknowledgmentPatterns = [
    /^thanks?/i,
    /^ok/i,
    /^got it/i,
    /^understood/i,
    /^yes/i,
    /^no/i,
    /^yup/i,
    /^nope/i
  ];
  
  if (acknowledgmentPatterns.some(pattern => pattern.test(message.text.trim()))) {
    return false;
  }

  return true;
}

/**
 * Extracts meaningful content from conversation messages
 */
function extractFilteredMessages(conversations: Conversation[]): {
  messages: FilteredMessage[];
  stats: FilteringStats;
} {
  const messages: FilteredMessage[] = [];
  const stats: FilteringStats = {
    total_conversations: conversations.length,
    total_messages: 0,
    valid_messages: 0,
    human_messages: 0,
    assistant_messages: 0,
    empty_messages: 0,
    short_messages: 0,
    long_messages: 0,
    average_length: 0
  };

  let totalLength = 0;

  for (const conversation of conversations) {
    for (const message of conversation.chat_messages) {
      stats.total_messages++;

      // Count message types
      if (message.sender === 'human') {
        stats.human_messages++;
      } else {
        stats.assistant_messages++;
      }

      // Check for empty messages
      if (!message.text || message.text.trim().length === 0) {
        stats.empty_messages++;
        continue;
      }

      // Check for short/long messages
      if (message.text.length < 50) {
        stats.short_messages++;
      } else if (message.text.length > 1000) {
        stats.long_messages++;
      }

      // Apply experience filtering
      if (isValidExperienceMessage(message)) {
        const filteredMessage: FilteredMessage = {
          id: message.uuid,
          text: message.text.trim(),
          sender: message.sender,
          timestamp: message.created_at,
          conversation_id: conversation.uuid,
          conversation_name: conversation.name || 'Unnamed Conversation'
        };

        messages.push(filteredMessage);
        stats.valid_messages++;
        totalLength += message.text.length;
      }
    }
  }

  stats.average_length = stats.valid_messages > 0 ? Math.round(totalLength / stats.valid_messages) : 0;

  return { messages, stats };
}

/**
 * Main filtering function
 */
async function preFilterConversations(inputPath: string, outputPath: string): Promise<void> {
  console.log('🔍 Starting conversation pre-filtering...');
  
  try {
    // Read the large JSON file
    console.log(`📖 Reading file: ${inputPath}`);
    const fileContent = readFileSync(inputPath, 'utf-8');
    
    // Parse JSON (this might take a while for 235MB)
    console.log('🔄 Parsing JSON...');
    const conversations: Conversation[] = JSON.parse(fileContent);
    
    console.log(`📊 Found ${conversations.length} conversations`);
    
    // Extract and filter messages
    console.log('🔍 Filtering messages...');
    const { messages, stats } = extractFilteredMessages(conversations);
    
    // Write filtered results
    console.log(`💾 Writing ${messages.length} filtered messages to ${outputPath}`);
    const output = {
      metadata: {
        original_file: inputPath,
        filtered_at: new Date().toISOString(),
        stats
      },
      messages
    };
    
    writeFileSync(outputPath, JSON.stringify(output, null, 2));
    
    // Print summary
    console.log('\n📈 Filtering Summary:');
    console.log(`   Total conversations: ${stats.total_conversations}`);
    console.log(`   Total messages: ${stats.total_messages}`);
    console.log(`   Valid messages: ${stats.valid_messages} (${Math.round(stats.valid_messages / stats.total_messages * 100)}%)`);
    console.log(`   Human messages: ${stats.human_messages}`);
    console.log(`   Assistant messages: ${stats.assistant_messages}`);
    console.log(`   Empty messages: ${stats.empty_messages}`);
    console.log(`   Short messages: ${stats.short_messages}`);
    console.log(`   Long messages: ${stats.long_messages}`);
    console.log(`   Average length: ${stats.average_length} characters`);
    
    console.log(`\n✅ Pre-filtering complete! Output saved to: ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Error during pre-filtering:', error);
    throw error;
  }
}

// CLI interface
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  const inputPath = process.argv[2] || 'data/migration/miguel-claude-conversations.json';
  const outputPath = process.argv[3] || 'data/migration/filtered-conversations.json';
  
  preFilterConversations(inputPath, outputPath)
    .then(() => {
      console.log('🎉 Pre-filtering completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Pre-filtering failed:', error);
      process.exit(1);
    });
}

export { preFilterConversations };
export type { FilteredMessage, FilteringStats }; 