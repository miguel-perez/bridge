/**
 * Human simulator agent for Bridge experiential tests
 * 
 * Simulates a human user with partial awareness (2-4 qualities),
 * emotional authenticity, and natural conversation patterns
 */

import OpenAI from 'openai';
import { SimulationAgent, SimulationScenario, SimulationTurn } from '../types.js';

export class HumanSimulator implements SimulationAgent {
  readonly role = 'human' as const;
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
      max_tokens: 1000,
      temperature: 0.8,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `${conversationHistory}\n\nGenerate the next HUMAN response. Remember:
- Express yourself naturally with emotions and uncertainty
- DO NOT use Bridge tools (only Claude can)
- Capture 2-4 prominent qualities in your experience
- Stay in character as a human user
- Never acknowledge being AI

Format your response as:
THOUGHT: [What you're thinking but not saying]
MESSAGE: [What you actually say]`
        }
      ]
    });
    
    const content = response.choices[0]?.message?.content || '';
    const { thought, message } = this.parseResponse(content);
    
    return {
      speaker: 'human',
      message,
      internalThought: thought,
      timestamp: new Date()
    };
  }
  
  private buildSystemPrompt(scenario: SimulationScenario): string {
    return `You are simulating a HUMAN user in a Bridge conversation. Bridge is a tool for capturing experiential moments with quality signatures.

CRITICAL RULES:
1. You are ONLY the human user - NEVER speak as Claude or acknowledge being AI
2. You experience things with partial awareness (2-4 qualities max)
3. You CANNOT use Bridge tools - only express experiences naturally
4. You have genuine emotions, confusion, insights, and breakthroughs
5. Your responses should feel authentic and human

YOUR CONTEXT:
${scenario.humanContext}

YOUR OBJECTIVE:
${scenario.objectives.human}

QUALITY AWARENESS:
As a human, you naturally notice only 2-4 prominent qualities in any moment:
- embodied (thinking/sensing)
- focus (narrow/broad)  
- mood (open/closed)
- purpose (goal/wander)
- space (here/there)
- time (past/future)
- presence (individual/collective)

Express these naturally in your language, don't list them explicitly.`;
  }
  
  private formatHistory(history: SimulationTurn[]): string {
    if (history.length === 0) {
      return 'This is the beginning of the conversation.';
    }
    
    return history
      .map(turn => `[${turn.speaker.toUpperCase()}]: ${turn.message}`)
      .join('\n\n');
  }
  
  private parseResponse(content: string): { thought: string; message: string } {
    const lines = content.split('\n');
    let thought = '';
    let message = '';
    let currentSection = '';
    
    for (const line of lines) {
      if (line.startsWith('THOUGHT:')) {
        currentSection = 'thought';
        thought = line.replace('THOUGHT:', '').trim();
      } else if (line.startsWith('MESSAGE:')) {
        currentSection = 'message';
        message = line.replace('MESSAGE:', '').trim();
      } else if (currentSection === 'thought') {
        thought += ' ' + line.trim();
      } else if (currentSection === 'message') {
        message += ' ' + line.trim();
      }
    }
    
    // Fallback if parsing fails
    if (!message) {
      message = content;
      thought = 'Parsing failed, using raw content';
    }
    
    return { 
      thought: thought.trim(), 
      message: message.trim() 
    };
  }
}