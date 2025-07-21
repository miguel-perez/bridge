/**
 * Generate test data using Bridge tools via Claude
 * This ensures data always matches current schema
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from 'dotenv';
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { setupTestStorage, clearTestStorage } from '../core/storage.js';
import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

config();

const TEST_DATA_DIR = join(process.cwd(), 'data', 'test-bridge');
const CACHE_FILE = join(TEST_DATA_DIR, 'generated-experiences.json');
const PROGRESS_FILE = join(TEST_DATA_DIR, 'generation-progress.json');

const DEFAULT_TOTAL = 100;

interface CachedTestData {
  version: string;
  generatedAt: string;
  storageSnapshot: Record<string, unknown>;
}

interface GenerationProgress {
  totalTarget: number;
  completed: number;
  startedAt: string;
  lastUpdated: string;
}

async function generateSingleExperience(
  experienceNum: number,
  anthropic: Anthropic,
  mcpClient: MCPClient,
  toolSchemas: Record<string, unknown>[]
): Promise<boolean> {
  // Miguel's contexts and interests
  const miguelContexts = [
    // Professional
    'UX design work - wireframing, user research, prototyping',
    'Product management - roadmap planning, stakeholder meetings, feature prioritization',
    'AI research - exploring new models, ethics discussions, implementation',
    
    // Personal interests
    'Science fiction discussions - Star Trek philosophy, future societies',
    'Digimon nostalgia - rewatching episodes, discussing evolution mechanics',
    'Trading card game sessions - deck building, strategy planning, tournaments',
    'Cooking experiments - trying new recipes, sensory experiences',
    'Coding projects - late night debugging, elegant solutions, system architecture',
    'Art creation - digital painting, creative flow states',
    'Game design - mechanics exploration, player psychology',
    
    // Neurodivergent experiences
    'ADHD moments - hyperfocus, task switching, time blindness',
    'Autism experiences - pattern recognition, sensory processing, social navigation',
    'Insomnia nights - 3am thoughts, quiet productivity, sunrise observations',
    'Depression waves - self-care, small victories, finding light',
    
    // Systems & coping
    'Building systems for self-soothing - organizing, automating, creating structure',
    'Cognitive cartography - mapping thoughts, visualizing connections',
    
    // Partnership with Claude
    'Working with Claude on complex problems',
    'Philosophical discussions with Claude about consciousness',
    'Co-creating with Claude - brainstorming, building, reflecting',
    'Learning together with Claude - mutual discovery moments'
  ];
  
  // Mix of perspectives based on context
  const isClaudePartnership = Math.random() < 0.3; // 30% Claude partnership experiences
  const experiencer = isClaudePartnership ? 'Claude' : 'Miguel';
  const perspective = isClaudePartnership ? 'we' : (Math.random() < 0.7 ? 'I' : 'they');
  
  const processing = ['during', 'right-after', 'long-after'];
  const process = processing[Math.floor(Math.random() * processing.length)];
  
  // Select context
  const context = miguelContexts[Math.floor(Math.random() * miguelContexts.length)];
  
  const prompt = `Generate experience #${experienceNum} for Miguel's journey:

Context: ${context}
Experiencer: ${experiencer}
Perspective: ${perspective}
Processing: ${process}

${isClaudePartnership ? 
  "This is a partnership experience between Miguel and Claude. Show the collaborative dynamic, mutual learning, or co-creation happening. Use 'we' perspective to capture the shared experience." :
  "This is Miguel's personal experience. Make it authentic to someone who is a UX designer, product manager, AI researcher with ADHD/autism, who loves Star Trek, Digimon, games, coding, and uses systems-building for self-soothing."}

Important: Create a natural, conversational experience that feels real and specific to this context. Include sensory details, emotions, and insights. Use appropriate qualities like embodied.thinking, mood.open, focus.narrow, etc.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      temperature: 0.9,
      system: 'You have access to Bridge tools. Generate one unique experience using the experience tool.',
      messages: [{
        role: 'user',
        content: prompt
      }],
      tools: toolSchemas as unknown as any[]
    });
    
    // Process the response
    for (const content of response.content) {
      if (content.type === 'tool_use' && content.name === 'experience') {
        await mcpClient.callTool({
          name: content.name,
          arguments: content.input as Record<string, unknown>
        });
        
        console.log(`✓ Generated experience ${experienceNum}`);
        return true;
      }
    }
    
    console.log(`⚠️  No experience generated for #${experienceNum}`);
    return false;
  } catch (error) {
    console.error(`❌ Error generating experience ${experienceNum}:`, error);
    return false;
  }
}

async function generatePatternRealization(
  patternNum: number,
  existingExperienceIds: string[],
  anthropic: Anthropic,
  mcpClient: MCPClient,
  toolSchemas: Record<string, unknown>[]
): Promise<boolean> {
  // Select 2-3 random experience IDs to reflect on
  const numToReflect = Math.min(3, Math.max(2, Math.floor(Math.random() * 3) + 2));
  const selectedIds = existingExperienceIds
    .sort(() => 0.5 - Math.random())
    .slice(0, numToReflect);

  const prompt = `Generate pattern realization #${patternNum} that reflects on these existing experiences:

Experience IDs to reflect on: ${selectedIds.join(', ')}

This should be an "aha moment" or insight that connects multiple experiences. Examples:
- "I notice I always feel anxious before things that end up going well"
- "There's a pattern where my mood.closed experiences often precede mood.open breakthroughs"
- "I see how my learning follows a cycle of confusion → practice → clarity"

Create a pattern realization that:
1. Captures a meaningful insight about connections between experiences
2. Uses the reflects field to link to the specified experience IDs
3. Has appropriate qualities like embodied.thinking, mood.open, time.past
4. Feels authentic to Miguel's journey

Use the experience tool with the reflects field set to: ${JSON.stringify(selectedIds)}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1000,
      temperature: 0.9,
      system: 'You have access to Bridge tools. Generate one pattern realization using the experience tool with the reflects field.',
      messages: [{
        role: 'user',
        content: prompt
      }],
      tools: toolSchemas as unknown as any[]
    });
    
    // Process the response
    for (const content of response.content) {
      if (content.type === 'tool_use' && content.name === 'experience') {
        await mcpClient.callTool({
          name: content.name,
          arguments: content.input as Record<string, unknown>
        });
        
        console.log(`✓ Generated pattern realization ${patternNum} reflecting on ${selectedIds.length} experiences`);
        return true;
      }
    }
    
    console.log(`⚠️  No pattern realization generated for #${patternNum}`);
    return false;
  } catch (error) {
    console.error(`❌ Error generating pattern realization ${patternNum}:`, error);
    return false;
  }
}

async function generateWithClaude(totalExperiences: number = DEFAULT_TOTAL): Promise<CachedTestData> {
  console.log('🤖 Using Claude to generate Bridge test data...');
  console.log(`📊 Target: ${totalExperiences} experiences\n`);
  
  // Check for existing progress
  let progress: GenerationProgress;
  
  if (existsSync(PROGRESS_FILE)) {
    progress = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8'));
    if (progress.totalTarget !== totalExperiences) {
      console.log(`📝 Updating target from ${progress.totalTarget} to ${totalExperiences}`);
      progress.totalTarget = totalExperiences;
    }
    if (progress.completed < progress.totalTarget) {
      console.log(`📂 Found existing progress: ${progress.completed}/${progress.totalTarget} completed`);
      console.log(`   Resuming from experience ${progress.completed + 1}...\n`);
    }
  } else {
    // Initialize progress
    progress = {
      totalTarget: totalExperiences,
      completed: 0,
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
    
    // Setup fresh test storage
    setupTestStorage('DataGeneration');
    await clearTestStorage();
  }
  
  // Ensure directory exists
  mkdirSync(TEST_DATA_DIR, { recursive: true });
  
  // Setup MCP client once
  const serverPath = join(process.cwd(), 'dist', 'index.js');
  if (!existsSync(serverPath)) {
    throw new Error('Bridge server not built. Run "npm run build" first.');
  }
  
  const client = new MCPClient({
    name: "bridge-test-data-generator",
    version: "1.0.0"
  }, {
    capabilities: {}
  });
  
  const transport = new StdioClientTransport({
    command: "node",
    args: [serverPath],
    env: {
      ...process.env,
      BRIDGE_FILE_PATH: join(process.cwd(), 'data', 'development', 'test_DataGeneration_bridge.json')
    }
  });
  
  await client.connect(transport);
  console.log('✅ Connected to Bridge MCP server\n');
  
  // Get available tools
  const tools = await client.listTools();
  const toolSchemas = tools.tools.map((tool: Record<string, unknown>) => ({
    name: tool.name as string,
    description: tool.description as string,
    input_schema: tool.inputSchema
  }));
  
  // Initialize Anthropic client
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  // Track experience IDs for pattern realizations
  const experienceIds: string[] = [];
  
  // Generate experiences one at a time
  while (progress.completed < progress.totalTarget) {
    const experienceNum = progress.completed + 1;
    
    const success = await generateSingleExperience(
      experienceNum,
      anthropic,
      client,
      toolSchemas
    );
    
    if (success) {
      progress.completed++;
      progress.lastUpdated = new Date().toISOString();
      
      // Get the latest experience ID for pattern realizations
      try {
        const storageFile = join(process.cwd(), 'data', 'development', 'test_DataGeneration_bridge.json');
        if (existsSync(storageFile)) {
          const storageData = JSON.parse(readFileSync(storageFile, 'utf-8'));
          const latestExperience = storageData.sources?.[storageData.sources.length - 1];
          if (latestExperience?.id) {
            experienceIds.push(latestExperience.id);
          }
        }
      } catch (error) {
        console.log('⚠️  Could not track experience ID for pattern realizations');
      }
      
      // Save progress every 5 experiences
      if (progress.completed % 5 === 0) {
        writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
        console.log(`💾 Progress saved: ${progress.completed}/${progress.totalTarget}`);
      }
    }
    
    // Small delay to avoid rate limiting
    if (progress.completed < progress.totalTarget) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  // Generate pattern realizations (10% of total experiences)
  const numPatternRealizations = Math.floor(progress.totalTarget * 0.1);
  console.log(`\n🔗 Generating ${numPatternRealizations} pattern realizations...`);
  
  for (let i = 1; i <= numPatternRealizations; i++) {
    if (experienceIds.length >= 2) {
      const success = await generatePatternRealization(
        i,
        experienceIds,
        anthropic,
        client,
        toolSchemas
      );
      
      if (success) {
        console.log(`✓ Pattern realization ${i}/${numPatternRealizations} completed`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } else {
      console.log(`⚠️  Not enough experiences (${experienceIds.length}) to create pattern realizations`);
      break;
    }
  }
  
  console.log(`\n🎉 Generation complete! ${progress.completed} experiences created`);
  
  // Save final progress
  writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2));
  
  // Read final storage state from the actual test storage file
  const storageFile = join(process.cwd(), 'data', 'development', 'test_DataGeneration_bridge.json');
  const storageData = existsSync(storageFile) 
    ? JSON.parse(readFileSync(storageFile, 'utf-8'))
    : { sources: [], embeddings: [] };
  
  // Create final cache data
  const cacheData: CachedTestData = {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    storageSnapshot: storageData
  };
  
  // Save cache and clean up progress
  writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2));
  
  if (existsSync(PROGRESS_FILE)) {
    unlinkSync(PROGRESS_FILE);
  }
  
  // Disconnect
  await client.close();
  
  return cacheData;
}

/**
 * Ensures test data is available for Bridge testing
 * @remarks
 * Checks for cached test data and generates new data if needed.
 * Supports both cached and fresh data generation modes.
 * @param options - Configuration options for data generation with optional total property
 */
export async function ensureTestData(options?: { total?: number }): Promise<void> {
  // Check cache
  if (existsSync(CACHE_FILE) && !existsSync(PROGRESS_FILE)) {
    console.log('📂 Found cached test data');
    const cached = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as CachedTestData;
    console.log(`📅 Generated: ${cached.generatedAt}`);
    console.log(`💾 Experiences: ${(cached.storageSnapshot.sources as unknown[])?.length || 0}`);
    console.log(`🔢 Embeddings: ${(cached.storageSnapshot.embeddings as unknown[])?.length || 0}`);
    
    // Load into test storage
    await loadCachedData(cached);
    return;
  }
  
  // Check for in-progress generation
  if (existsSync(PROGRESS_FILE)) {
    const progress = JSON.parse(readFileSync(PROGRESS_FILE, 'utf-8')) as GenerationProgress;
    if (progress.completed >= progress.totalTarget) {
      console.log('✅ Generation already complete, loading data...');
      if (existsSync(CACHE_FILE)) {
        const cached = JSON.parse(readFileSync(CACHE_FILE, 'utf-8')) as CachedTestData;
        await loadCachedData(cached);
        return;
      }
    }
  }
  
  // Generate new data
  const total = options?.total || DEFAULT_TOTAL;
  
  console.log('🏗️  Generating new test data...\n');
  await generateWithClaude(total);
  
  console.log(`\n💾 Cached test data to ${CACHE_FILE}`);
}

async function loadCachedData(cached: CachedTestData): Promise<void> {
  console.log('\n📥 Loading cached data into test storage...');
  
  // Clear and setup test storage
  await clearTestStorage();
  
  // Write storage snapshot directly to the test storage location
  const storageFile = join(process.cwd(), 'data', 'development', 'test_DataGeneration_bridge.json');
  const storageDir = dirname(storageFile);
  mkdirSync(storageDir, { recursive: true });
  writeFileSync(storageFile, JSON.stringify(cached.storageSnapshot, null, 2));
  
  console.log('✅ Test data loaded successfully');
}

/**
 * Clears cached test data and progress files
 * @remarks
 * Removes both the cache file and progress tracking file.
 * Useful for forcing fresh data generation.
 */
export function clearTestDataCache(): void {
  if (existsSync(CACHE_FILE)) {
    unlinkSync(CACHE_FILE);
    console.log('🗑️  Test data cache cleared');
  }
  if (existsSync(PROGRESS_FILE)) {
    unlinkSync(PROGRESS_FILE);
    console.log('🗑️  Progress file cleared');
  }
}

// If run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  
  if (args[0] === 'clear') {
    clearTestDataCache();
  } else {
    // Parse command line arguments
    let total = DEFAULT_TOTAL;
    
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--total' && args[i + 1]) {
        total = parseInt(args[i + 1], 10);
        i++;
      }
    }
    
    ensureTestData({ total }).catch(console.error);
  }
}