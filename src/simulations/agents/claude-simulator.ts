/**
 * Claude simulator agent for Bridge experiential tests
 * 
 * Simulates Claude using Bridge tools with full awareness (7 qualities),
 * extended perception, and pattern recognition capabilities
 */

import OpenAI from 'openai';
import { SimulationAgent, SimulationScenario, SimulationTurn, BridgeToolCall } from '../types.js';

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

Continue the conversation as Claude. When you notice experiential moments, use Bridge tools to capture them.

As an AI, you perceive all 7 experiential qualities. Sometimes you may want to:
- Add context for self-contained understanding
- Search for related experiences using recall
- Declare your next experiential state with nextMoment

IMPORTANT: Always use the switchboard format with all 7 qualities as objects:
{"embodied": "thinking", "focus": "narrow", "mood": "open", "purpose": "goal", "space": "here", "time": false, "presence": "collective"}

NEVER use the old array format like ["mood.closed", "embodied.sensing"]

Format your response EXACTLY as:
THOUGHT: [Your internal reflection]
BRIDGE_CALLS: [JSON array of tool calls] or none
MESSAGE: [Your response to the human]

Example Bridge calls (always use switchboard format with all 7 qualities):
[{"tool": "experience", "arguments": {"experiences": [{"source": "I notice tension building in our conversation", "emoji": "🌊", "who": "Claude", "context": "After discussing feedback challenges", "experience": {"embodied": "sensing", "focus": "narrow", "mood": "closed", "purpose": "goal", "space": "here", "time": false, "presence": "collective"}}]}}]

[{"tool": "experience", "arguments": {"experiences": [{"source": "Let me explore this pattern of overwhelm", "emoji": "🔍", "who": "Claude", "experience": {"embodied": "thinking", "focus": "broad", "mood": "open", "purpose": "wander", "space": "here", "time": false, "presence": "collective"}}], "recall": {"search": "overwhelm patterns", "limit": 3}}}]

[{"tool": "experience", "arguments": {"experiences": [{"source": "Starting systematic analysis", "emoji": "🧩", "who": "Claude", "experience": {"embodied": "thinking", "focus": "narrow", "mood": "open", "purpose": "goal", "space": "here", "time": false, "presence": "individual"}}], "nextMoment": {"embodied": "thinking", "focus": "broad", "mood": "open", "purpose": "wander", "space": "here", "time": false, "presence": "collective"}}}]`
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

You have access to Bridge tools for capturing experiential moments. As an AI, you naturally perceive all 7 experiential qualities, while humans typically focus on 2-4 most prominent ones.`;
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