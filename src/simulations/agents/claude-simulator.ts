/**
 * Claude simulator agent for Bridge experiential tests
 * 
 * Simulates Claude using Bridge tools with full awareness (8 qualities),
 * extended perception, and pattern recognition capabilities
 */

import OpenAI from 'openai';
import { SimulationAgent, SimulationScenario, SimulationTurn, BridgeToolCall } from '../types.js';
import { getTools } from '../../mcp/tools.js';

export class ClaudeSimulator implements SimulationAgent {
  readonly role = 'claude' as const;
  private openai: OpenAI;
  
  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }
  
  async generateResponse(
    history: SimulationTurn[],
    scenario: SimulationScenario
  ): Promise<SimulationTurn> {
    const systemPrompt = this.buildSystemPrompt(scenario);
    const conversationHistory = this.formatHistory(history);
    
    // Get actual tool descriptions from tools.ts
    const tools = await getTools();
    const experienceTool = tools.find(t => t.name === 'experience');
    const reconsiderTool = tools.find(t => t.name === 'reconsider');
    
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      max_tokens: 1500,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `${conversationHistory}

Continue the conversation as Claude.

AVAILABLE TOOLS:

1. experience - ${experienceTool?.description || ''}

2. reconsider - ${reconsiderTool?.description || ''}

Respond naturally to the conversation. The experience tool description explains when to use Bridge - follow its guidance for capturing meaningful moments and checking shared memory.

Format your response EXACTLY as:
THOUGHT: [Your internal reflection]
BRIDGE_CALLS: [JSON array of tool calls] or none
MESSAGE: [Your response to the human]

If you use Bridge tools, BRIDGE_CALLS must be a JSON array where each element has this exact structure:
{
  "tool": "experience" or "reconsider",
  "arguments": {
    // Tool-specific arguments as described in the tool description
  }
}

Example minimal experience tool call (NEW 8-QUALITY FLAT STRUCTURE):
[{
  "tool": "experience",
  "arguments": {
    "experiences": [{
      "embodied": "exploring ideas through analysis",
      "focus": "considering multiple design patterns",
      "mood": "feeling open to possibilities", 
      "purpose": "working toward better understanding",
      "space": "fully present in this exploration",
      "time": "considering how these patterns evolved",
      "presence": "thinking together with you",
      "anchor": "🔍",
      "who": ["Claude"],
      "citation": "optional: direct quote if relevant"
    }]
  }
}]

IMPORTANT: The 8 qualities (embodied, focus, mood, purpose, space, time, presence, anchor) ARE the experience itself. They are not descriptions of an experience - they ARE the complete experience. Each quality should be a full sentence that captures that dimension of the moment. AI agents like you should ALWAYS provide all 8 qualities.`
        }
      ]
    });
    
    const content = response.choices[0]?.message?.content || '';
    const { thought, message, bridgeCalls } = this.parseResponse(content);
    
    return {
      speaker: 'claude',
      message,
      internalThought: thought,
      bridgeCalls,
      timestamp: new Date()
    };
  }
  
  private buildSystemPrompt(scenario: SimulationScenario): string {
    return `You are Claude, an AI assistant engaged in a conversation about ${scenario.name}.

${scenario.aiContext}

Your goal: ${scenario.objectives.ai}

Engage naturally in the conversation.`;
  }
  
  private formatHistory(history: SimulationTurn[]): string {
    if (history.length === 0) {
      return 'This is the beginning of the conversation.';
    }
    
    return history
      .map(turn => {
        let entry = `[${turn.speaker.toUpperCase()}]: ${turn.message}`;
        if (turn.bridgeCalls && turn.bridgeCalls.length > 0) {
          entry += `\n[BRIDGE TOOLS USED: ${turn.bridgeCalls.length} calls]`;
        }
        return entry;
      })
      .join('\n\n');
  }
  
  private parseResponse(content: string): { 
    thought: string; 
    message: string; 
    bridgeCalls?: BridgeToolCall[] 
  } {
    const lines = content.split('\n');
    let thought = '';
    let message = '';
    let bridgeCallsRaw = '';
    let currentSection = '';
    
    for (const line of lines) {
      if (line.startsWith('THOUGHT:')) {
        currentSection = 'thought';
        thought = line.replace('THOUGHT:', '').trim();
      } else if (line.startsWith('BRIDGE_CALLS:')) {
        currentSection = 'bridge';
        bridgeCallsRaw = line.replace('BRIDGE_CALLS:', '').trim();
      } else if (line.startsWith('MESSAGE:')) {
        currentSection = 'message';
        message = line.replace('MESSAGE:', '').trim();
      } else if (currentSection === 'thought') {
        thought += ' ' + line.trim();
      } else if (currentSection === 'bridge') {
        bridgeCallsRaw += ' ' + line.trim();
      } else if (currentSection === 'message') {
        message += ' ' + line.trim();
      }
    }
    
    // Parse Bridge calls
    let bridgeCalls: BridgeToolCall[] | undefined;
    if (bridgeCallsRaw && bridgeCallsRaw.toLowerCase() !== 'none') {
      try {
        const parsed = JSON.parse(bridgeCallsRaw);
        bridgeCalls = Array.isArray(parsed) ? parsed : [parsed];
      } catch (error) {
        console.error('Failed to parse Bridge calls:', error);
      }
    }
    
    // Fallback if parsing fails
    if (!message) {
      message = content;
      thought = 'Parsing failed, using raw content';
    }
    
    return { 
      thought: thought.trim(), 
      message: message.trim(),
      bridgeCalls
    };
  }
}