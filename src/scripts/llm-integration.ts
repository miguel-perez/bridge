import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { Anthropic } from "@anthropic-ai/sdk";
import { join } from 'path';
import dotenv from 'dotenv';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';

// Load environment variables
dotenv.config();

// Helper functions for batch migration
function readBridgeDatabase(): any[] {
  const databasePath = join(process.cwd(), 'bridge.json');
  if (!existsSync(databasePath)) {
    throw new Error('bridge.json not found');
  }
  
  const databaseContent = readFileSync(databasePath, 'utf-8');
  const database = JSON.parse(databaseContent);
  
  // Handle different database structures
  if (Array.isArray(database)) {
    return database;
  } else if (database.sources && Array.isArray(database.sources)) {
    return database.sources;
  } else {
    throw new Error('Invalid database structure');
  }
}

function filterSourcesByExperiencer(sources: any[], experiencerName: string): any[] {
  return sources.filter(source => 
    source.experiencer && 
    source.experiencer.toLowerCase() === experiencerName.toLowerCase()
  );
}

function needsMigration(source: any): boolean {
  return (
    !source.narrative || source.narrative.length === 0 || // Missing or empty narrative
    source.vector || // Has old vector format
    !source.experiential_qualities || // Missing experiential qualities
    source.content_embedding || // Has old embedding field name
    !source.narrative_embedding // Missing new embedding field
  );
}

function createMigrationBatch(sources: any[], batchSize: number = 5): any[][] {
  const batches: any[][] = [];
  for (let i = 0; i < sources.length; i += batchSize) {
    batches.push(sources.slice(i, i + batchSize));
  }
  return batches;
}

function formatSourceForMigration(source: any): string {
  return `
Source ID: ${source.id}
Content: ${source.content || 'No content'}
Experiencer: ${source.experiencer || 'Not specified'}
Perspective: ${source.perspective || 'Not specified'}
Processing: ${source.processing || 'Not specified'}
Occurred: ${source.occurred || 'Not specified'}
Crafted: ${source.crafted || false}
Experiential Qualities: ${JSON.stringify(source.experiential_qualities || {}, null, 2)}
System Time: ${source.system_time || 'Not specified'}
`;
}

// Test scenarios for different development phases
const TEST_SCENARIOS = {
  // Quick tool validation
  'tool-discovery': `
    List all available tools and describe what each one does. 
    Focus on understanding the tool purposes and required parameters.
  `,
  
  // Basic functionality testing
  'basic-capture': `
    Create a simple experiential capture about feeling excited about a new project.
    Use the capture tool with minimal required fields.
    
    IMPORTANT: The narrative field must be a concise experiential summary (max 200 characters) 
    written in the experiencer's voice, using present tense and active language.
    Example: "Heart races as possibilities unfold" or "Fingers itch to dive into new project"
  `,
  
  // Search functionality
  'basic-search': `
    Search for experiences related to "learning" or "growth".
    Try different search parameters and see what results you get.
  `,
  
  // Complex workflow
  'capture-search-update': `
    1. First, capture an experience about learning to code
    2. Then search for experiences about learning or education
    3. Finally, update one of the search results with corrected experiential analysis
    Report on each step and any issues you encounter.
  `,
  
  // Error handling
  'error-testing': `
    Try to use the capture tool with invalid or missing parameters.
    Test what happens when you provide bad experiential qualities.
    Report how the system handles errors.
  `,

  // === REALISTIC DOMAIN-SPECIFIC SCENARIOS ===
  
  // Phenomenological Research Workflow
  'phenomenological-research': `
    You are Dr. Sarah Chen, a phenomenological researcher studying learning experiences in online education.
    
    Your research question is: "How do adult learners experience moments of breakthrough understanding in self-directed learning environments?"
    
    TASK: Conduct a phenomenological analysis session using the Bridge tool.
    
    1. First, capture 3-4 diverse learning experiences from different perspectives:
       - A moment of sudden clarity while learning a new programming concept
       - The experience of finally understanding a complex mathematical theorem
       - A breakthrough in learning a new language
       - The feeling of mastery when a skill "clicks"
    
    2. For each capture, focus on:
       - The lived experience (what it felt like in the moment)
       - The experiential qualities (emotional, cognitive, embodied aspects)
       - The context and circumstances
       - The narrative richness and authenticity
    
    3. Then search for patterns across these experiences:
       - Look for common experiential qualities
       - Search for similar emotional states
       - Find experiences with similar cognitive processes
       - Analyze the temporal aspects of breakthrough moments
    
    4. Finally, synthesize your findings:
       - What patterns emerge across the experiences?
       - How do the experiential qualities relate to learning outcomes?
       - What insights can you draw about the nature of breakthrough learning?
    
    EVALUATE: How well does the tool support phenomenological research? Consider:
    - Ease of capturing rich experiential data
    - Ability to search for phenomenological patterns
    - Support for iterative analysis and refinement
    - Clarity of the experiential quality framework
  `,

  // Therapeutic Practice Scenario
  'therapeutic-practice': `
    You are Dr. Marcus Rodriguez, a therapist specializing in trauma-informed care and mindfulness-based interventions.
    
    You're working with a client who has been experiencing anxiety related to work stress. During today's session, 
    your client shared a powerful moment of insight while practicing a breathing exercise.
    
    TASK: Use the Bridge tool to document and analyze this therapeutic moment.
    
    1. Capture the client's experience:
       - The moment of insight during the breathing exercise
       - The shift in their emotional state
       - The embodied sensations they described
       - The cognitive realizations that emerged
    
    2. Analyze the experiential qualities:
       - What made this moment therapeutic?
       - How did the client's perspective shift?
       - What processing level best describes this experience?
       - Which experiential qualities were most prominent?
    
    3. Search your practice database:
       - Look for similar breakthrough moments with other clients
       - Find experiences with similar therapeutic qualities
       - Search for patterns in anxiety reduction experiences
       - Identify common factors in successful interventions
    
    4. Document for future reference:
       - What worked in this session?
       - How can you replicate this therapeutic approach?
       - What insights can inform your practice?
    
    EVALUATE: How well does the tool support therapeutic practice? Consider:
    - Ability to capture nuanced emotional experiences
    - Support for clinical documentation and analysis
    - Ease of finding relevant case examples
    - Integration with therapeutic frameworks
  `,

  // Product UX Research Scenario
  'ux-research': `
    You are Alex Kim, a Senior UX Researcher at a fintech startup developing a new investment app.
    
    You've just completed user interviews with 8 participants who tried your app's new "goal-based investing" feature.
    Several users had strong emotional reactions - both positive and negative - to the experience.
    
    TASK: Use the Bridge tool to analyze these user experiences and identify design insights.
    
    1. Capture the most significant user experiences:
       - A user who felt empowered and confident using the feature
       - A user who felt overwhelmed and anxious about the interface
       - A user who experienced confusion about the investment process
       - A user who felt excited about achieving their financial goals
    
    2. For each experience, focus on:
       - The emotional journey through the app
       - Specific moments of delight or frustration
       - The user's perspective and mental model
       - How the experience felt in their body (tension, excitement, etc.)
    
    3. Search for patterns and insights:
       - Look for common pain points across users
       - Find experiences with similar emotional qualities
       - Search for moments of user empowerment
       - Identify what creates trust vs. anxiety
    
    4. Synthesize design recommendations:
       - What design patterns support positive experiences?
       - What elements create negative emotional states?
       - How can you amplify positive experiences?
       - What changes would reduce user anxiety?
    
    EVALUATE: How well does the tool support UX research? Consider:
    - Ability to capture user emotional experiences
    - Support for identifying design patterns
    - Ease of finding similar user experiences
    - Integration with design thinking processes
  `,

  // Educational Assessment Scenario
  'educational-assessment': `
    You are Professor Elena Vasquez, an educational psychologist studying student engagement in online learning.
    
    You're analyzing student reflections from a course on "Digital Storytelling" where students were asked to 
    document their learning journey through weekly experiential captures.
    
    TASK: Use the Bridge tool to analyze student learning experiences and assess course effectiveness.
    
    1. Review and categorize student experiences:
       - Moments of creative breakthrough
       - Experiences of technical frustration
       - Feelings of connection with classmates
       - Instances of personal growth and confidence building
    
    2. For each category, analyze:
       - The experiential qualities that emerge
       - How students process and reflect on their learning
       - The emotional and cognitive aspects of their journey
       - Patterns in their narrative development
    
    3. Search for learning patterns:
       - Find experiences related to specific course activities
       - Look for common challenges and successes
       - Identify what creates engagement vs. disengagement
       - Search for evidence of skill development over time
    
    4. Assess course effectiveness:
       - What learning experiences were most valuable?
       - Where did students struggle most?
       - How did the course support different learning styles?
       - What recommendations can you make for course improvement?
    
    EVALUATE: How well does the tool support educational assessment? Consider:
    - Ability to capture student learning experiences
    - Support for identifying learning patterns
    - Ease of tracking progress over time
    - Integration with educational frameworks
  `,

  // Personal Development Coaching Scenario
  'personal-development': `
    You are Coach Maya Thompson, a certified life coach specializing in career transitions and personal growth.
    
    You're working with a client, James, who is transitioning from a corporate job to starting his own business.
    James has been using the Bridge tool to document his daily experiences and insights during this transition.
    
    TASK: Use the Bridge tool to analyze James's journey and provide targeted coaching support.
    
    1. Review James's recent experiences:
       - His feelings about leaving his corporate job
       - Moments of doubt and uncertainty
       - Experiences of excitement about his new venture
       - Interactions with potential clients and partners
    
    2. Analyze the patterns in his experiences:
       - What triggers his confidence vs. anxiety?
       - How does he process setbacks and successes?
       - What experiential qualities dominate his journey?
       - How has his perspective evolved over time?
    
    3. Search for insights and strategies:
       - Look for similar transition experiences
       - Find patterns in successful career changes
       - Search for coping strategies for uncertainty
       - Identify what builds resilience and confidence
    
    4. Develop coaching recommendations:
       - What strengths can James leverage?
       - What areas need more support?
       - How can he maintain momentum?
       - What practices would support his growth?
    
    EVALUATE: How well does the tool support personal development coaching? Consider:
    - Ability to track personal growth over time
    - Support for identifying patterns and insights
    - Ease of finding relevant strategies and examples
    - Integration with coaching methodologies
  `,

  // Full integration test
  'full-integration': `
    Hi, Claude My name is Miguel, and I'm going to be walking you through this session today. 
    We're asking Claude to try using the Bridge MCP tool that we're working on so we can see whether it works as intended. 
    The first thing I want to make clear right away is that we're testing the site, not you. 
    You can't do anything wrong here. In fact, this is probably the one place today where you don't have to worry about making mistakes. 
    As much as possible to try to think out loud: to say what you're looking at, what you're trying to do, and what you're thinking. 
    This will be a big help to us. Also, please don't worry that you're going to hurt our feelings. 
    We're doing this to improve, so we need to hear your honest reactions. If you have any questions as we go along, just ask them. 
    I may not be able to answer them right away, since we're interested in how AI do when they don't have a developer sitting next to them to help. 
    But if you still have any questions when we're done I'll try to answer them then. 
    First, I'm going to ask you to look at this MCP tool and tell me what you make of it: what strikes you about it, whose it for, what you can do, and what it's for. 
    Just look around and do a little narrative. Don't use any of the tools just yet. 
    Afterward, look at all the tool definitions and define a lists of tasks. Then begin to execute them. 
    First, say what you would expect to happen. Then, run the tool and observe what actually happens. 
    Create a comprehensive path through all the features in an order that is most efficient. Focus a lot on search. 
    
    IMPORTANT: When using the search tool, make sure to include these parameters for better results:
    - includeContext: true (to show metadata like experiencer, perspective, processing level, and experiential qualities)
    - includeFullContent: true (to show the full content instead of truncated snippets)
    - limit: 10 (to get a reasonable number of results)
    
    Finally, note misalignments between your expectation and reality, good or bad.
  `,

  // Batch migration scenario
  'batch-migration': `
    You are helping migrate a database of experiential captures to a new schema. 
    The sources provided need proper narrative fields generated from their content.
    
    TASK: Process each source systematically using the capture tool.
    
    For each source:
    1. Analyze the content and any existing experiential qualities
    2. Generate a concise experiential narrative summary in the experiencer's voice
    3. Use the capture tool to create a new source with the updated schema
    4. Ensure all required fields are properly filled (narrative is now required)
    5. Preserve all original experiential qualities and metadata
    
    NARRATIVE GUIDELINES:
    - The 'narrative' field is REQUIRED and must be a concise experiential summary (max 200 chars)
    - Write as if the experiencer is narrating their moment in present tense with active language
    - Use the experiencer's own words, slang, or phrasing whenever possible
    - Start with a verb or action when possible—let the moment move
    - Match the tone and emotional register of the source
    - Feel like a thought, sensation, or action arising in the moment, not a label or report
    - Examples: "Step through puddles as rain drums", "Fidget with pen, heart thuds hard", "Stir sauce, laughter spills from kitchen"
    
    IMPORTANT GUIDELINES:
    - Preserve the original perspective, experiencer, processing level, and other metadata
    - Keep the original experiential qualities exactly as they are
    - If content is missing, use the narrative as the content
    - Process sources one at a time and report your progress
    
    Sources to migrate:
    [Sources will be provided here]
    
    Please process each source systematically and report your progress after each capture.
  `
};

class EnhancedLLMTester {
  private mcp: MCPClient;
  private anthropic: Anthropic;
  private testResults: any[] = [];

  constructor() {
    this.mcp = new MCPClient({ 
      name: "bridge-llm-integration-test", 
      version: "1.0.0" 
    });
    
    this.anthropic = new Anthropic({ 
      apiKey: process.env.ANTHROPIC_API_KEY 
    });
  }

  // === USABILITY EVALUATION FRAMEWORK ===
  
  // Usability metrics interface
  private getUsabilityMetrics(): any {
    return {
      discoverability: 0,      // How easily can users find and understand tools?
      learnability: 0,         // How quickly can users learn to use the tool effectively?
      efficiency: 0,           // How efficiently can users accomplish their goals?
      errorPrevention: 0,      // How well does the tool prevent user errors?
      errorRecovery: 0,        // How easily can users recover from errors?
      satisfaction: 0,         // How satisfied are users with the experience?
      accessibility: 0,        // How accessible is the tool to different user types?
      domainAlignment: 0       // How well does the tool align with domain-specific needs?
    };
  }

  private getUsabilityAnalysis(): any {
    return {
      metrics: this.getUsabilityMetrics(),
      insights: [],
      recommendations: [],
      domainSpecificFeedback: {}
    };
  }

  private analyzeUsability(testResult: any, scenario: string): any {
    const analysis = this.getUsabilityAnalysis();

    // Analyze tool discovery and understanding
    const toolDiscoveryText = this.extractToolDiscoveryText();
    analysis.metrics.discoverability = this.scoreDiscoverability(toolDiscoveryText);
    
    // Analyze learning curve
    const learningPatterns = this.analyzeLearningPatterns(testResult.toolCalls);
    analysis.metrics.learnability = this.scoreLearnability(learningPatterns);
    
    // Analyze efficiency
    const efficiencyMetrics = this.calculateEfficiencyMetrics(testResult);
    analysis.metrics.efficiency = this.scoreEfficiency(efficiencyMetrics);
    
    // Analyze error handling
    const errorAnalysis = this.analyzeErrorHandling(testResult);
    analysis.metrics.errorPrevention = errorAnalysis.prevention;
    analysis.metrics.errorRecovery = errorAnalysis.recovery;
    
    // Analyze satisfaction and domain alignment
    const satisfactionAnalysis = this.analyzeSatisfactionAndAlignment(testResult, scenario);
    analysis.metrics.satisfaction = satisfactionAnalysis.satisfaction;
    analysis.metrics.domainAlignment = satisfactionAnalysis.domainAlignment;
    
    // Generate insights and recommendations
    analysis.insights = this.generateUsabilityInsights(analysis.metrics);
    analysis.recommendations = this.generateUsabilityRecommendations(analysis.metrics);
    
    // Domain-specific analysis
    analysis.domainSpecificFeedback = this.analyzeDomainSpecificUsability(testResult, scenario);
    
    return analysis;
  }

  private extractToolDiscoveryText(): string {
    // Extract text where the LLM describes discovering and understanding tools
    // This would analyze the conversation text for tool discovery patterns
    // For now, return a placeholder
    return "Tool discovery analysis placeholder";
  }

  private scoreDiscoverability(discoveryText: string): number {
    // Score based on how well the LLM understood the tools
    // Higher score = better tool descriptions and discoverability
    const indicators = {
      clearPurpose: discoveryText.includes('purpose') || discoveryText.includes('for'),
      parameterUnderstanding: discoveryText.includes('parameter') || discoveryText.includes('input'),
      useCaseClarity: discoveryText.includes('use') || discoveryText.includes('scenario'),
      confidence: discoveryText.includes('clear') || discoveryText.includes('understand')
    };
    
    const score = Object.values(indicators).filter(Boolean).length / Object.keys(indicators).length;
    return score * 10; // Scale to 0-10
  }

  private analyzeLearningPatterns(toolCalls: any[]): any {
    return {
      firstUseSuccess: toolCalls.length > 0 ? toolCalls[0].success : false,
      parameterAccuracy: this.calculateParameterAccuracy(toolCalls),
      toolSelectionAccuracy: this.calculateToolSelectionAccuracy(),
      learningCurve: this.calculateLearningCurve(toolCalls)
    };
  }

  private calculateParameterAccuracy(toolCalls: any[]): number {
    // Analyze how accurately the LLM used tool parameters
    const validCalls = toolCalls.filter(call => call.success);
    return validCalls.length / toolCalls.length;
  }

  private calculateToolSelectionAccuracy(): number {
    // Analyze whether the LLM chose appropriate tools for the task
    // This would require domain-specific logic
    return 0.8; // Placeholder
  }

  private calculateLearningCurve(toolCalls: any[]): any {
    // Analyze how the LLM's tool usage improved over time
    if (toolCalls.length < 2) return { improvement: 0 };
    
    const earlyCalls = toolCalls.slice(0, Math.ceil(toolCalls.length / 2));
    const laterCalls = toolCalls.slice(Math.ceil(toolCalls.length / 2));
    
    const earlySuccess = earlyCalls.filter(call => call.success).length / earlyCalls.length;
    const laterSuccess = laterCalls.filter(call => call.success).length / laterCalls.length;
    
    return { improvement: laterSuccess - earlySuccess };
  }

  private scoreLearnability(patterns: any): number {
    const scores = [
      patterns.firstUseSuccess ? 8 : 4,
      patterns.parameterAccuracy * 10,
      patterns.toolSelectionAccuracy * 10,
      Math.max(0, patterns.learningCurve.improvement * 10)
    ];
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private calculateEfficiencyMetrics(testResult: any): any {
    const duration = testResult.endTime.getTime() - testResult.startTime.getTime();
    const successfulCalls = testResult.toolCalls.filter((call: any) => call.success).length;
    const totalCalls = testResult.toolCalls.length;
    
    return {
      timePerSuccessfulTask: duration / successfulCalls,
      successRate: successfulCalls / totalCalls,
      callsPerMinute: (totalCalls / duration) * 60000,
      taskCompletion: this.assessTaskCompletion(testResult)
    };
  }

  private assessTaskCompletion(testResult: any): number {
    // Analyze whether the LLM completed the intended task
    const scenario = testResult.scenario;
    const toolCalls = testResult.toolCalls;
    
    // Domain-specific completion criteria
    const completionCriteria = {
      'phenomenological-research': {
        requiredTools: ['capture', 'search'],
        minCaptures: 3,
        minSearches: 2
      },
      'therapeutic-practice': {
        requiredTools: ['capture', 'search'],
        minCaptures: 1,
        minSearches: 1
      },
      'ux-research': {
        requiredTools: ['capture', 'search'],
        minCaptures: 2,
        minSearches: 2
      }
    };
    
    const criteria = completionCriteria[scenario as keyof typeof completionCriteria];
    if (!criteria) return 0.5; // Default score for unknown scenarios
    
    const toolUsage = toolCalls.map((call: any) => call.tool);
    const captures = toolUsage.filter((tool: string) => tool === 'capture').length;
    const searches = toolUsage.filter((tool: string) => tool === 'search').length;
    
    const toolScore = criteria.requiredTools.every(tool => toolUsage.includes(tool)) ? 1 : 0.5;
    const captureScore = captures >= criteria.minCaptures ? 1 : captures / criteria.minCaptures;
    const searchScore = searches >= criteria.minSearches ? 1 : searches / criteria.minSearches;
    
    return (toolScore + captureScore + searchScore) / 3;
  }

  private scoreEfficiency(metrics: any): number {
    const scores = [
      metrics.successRate * 10,
      metrics.taskCompletion * 10,
      Math.min(10, 10 / (metrics.timePerSuccessfulTask / 60000)) // Time efficiency
    ];
    
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private analyzeErrorHandling(testResult: any): { prevention: number; recovery: number } {
    const errors = testResult.errors;
    const toolCalls = testResult.toolCalls;
    
    // Error prevention: how well does the tool prevent errors?
    const preventionScore = this.assessErrorPrevention(toolCalls);
    
    // Error recovery: how well does the LLM recover from errors?
    const recoveryScore = this.assessErrorRecovery(errors, toolCalls);
    
    return {
      prevention: preventionScore,
      recovery: recoveryScore
    };
  }

  private assessErrorPrevention(toolCalls: any[]): number {
    // Analyze parameter validation and error prevention
    const validCalls = toolCalls.filter(call => call.success);
    const invalidCalls = toolCalls.filter(call => !call.success);
    
    // Higher score if fewer errors and better parameter validation
    const errorRate = invalidCalls.length / toolCalls.length;
    const successRate = validCalls.length / toolCalls.length;
    return Math.max(0, 10 - (errorRate * 10)) * successRate;
  }

  private assessErrorRecovery(errors: string[], toolCalls: any[]): number {
    // Analyze how well the LLM recovers from errors
    if (errors.length === 0) return 10;
    
    // Look for patterns of retry and correction
    const recoveryIndicators = [
      errors.length < toolCalls.length * 0.3, // Not too many errors
      toolCalls.some(call => call.success), // At least some success
      errors.length < 3 // Reasonable error count
    ];
    
    const recoveryScore = recoveryIndicators.filter(Boolean).length / recoveryIndicators.length;
    return recoveryScore * 10;
  }

  private analyzeSatisfactionAndAlignment(testResult: any, scenario: string): { satisfaction: number; domainAlignment: number } {
    // Analyze satisfaction from the LLM's feedback and domain alignment
    const conversationText = this.extractConversationText();
    
    const satisfaction = this.scoreSatisfaction(conversationText);
    const domainAlignment = this.scoreDomainAlignment(conversationText, scenario);
    
    return { satisfaction, domainAlignment };
  }

  private extractConversationText(): string {
    // Extract the conversation text for analysis
    // This would need to be implemented based on how conversation is stored
    return "Conversation text placeholder";
  }

  private scoreSatisfaction(conversationText: string): number {
    // Analyze satisfaction indicators in the conversation
    const positiveIndicators = [
      'helpful', 'useful', 'effective', 'good', 'great', 'excellent',
      'clear', 'intuitive', 'easy', 'smooth', 'successful'
    ];
    
    const negativeIndicators = [
      'confusing', 'difficult', 'frustrating', 'unclear', 'problem',
      'error', 'issue', 'complicated', 'awkward'
    ];
    
    const positiveCount = positiveIndicators.filter(indicator => 
      conversationText.toLowerCase().includes(indicator)
    ).length;
    
    const negativeCount = negativeIndicators.filter(indicator => 
      conversationText.toLowerCase().includes(indicator)
    ).length;
    
    const totalIndicators = positiveCount + negativeCount;
    if (totalIndicators === 0) return 5; // Neutral if no indicators
    
    return (positiveCount / totalIndicators) * 10;
  }

  private scoreDomainAlignment(conversationText: string, scenario: string): number {
    // Analyze how well the tool aligns with domain-specific needs
    const domainKeywords = {
      'phenomenological-research': ['research', 'analysis', 'patterns', 'qualitative', 'experiential'],
      'therapeutic-practice': ['therapy', 'client', 'session', 'intervention', 'clinical'],
      'ux-research': ['user', 'design', 'interface', 'experience', 'usability'],
      'educational-assessment': ['learning', 'student', 'education', 'course', 'assessment'],
      'personal-development': ['coaching', 'growth', 'development', 'transition', 'personal']
    };
    
    const keywords = domainKeywords[scenario as keyof typeof domainKeywords] || [];
    const keywordMatches = keywords.filter(keyword => 
      conversationText.toLowerCase().includes(keyword)
    ).length;
    
    return Math.min(10, (keywordMatches / keywords.length) * 10);
  }

  private generateUsabilityInsights(metrics: any): string[] {
    const insights: string[] = [];
    
    if (metrics.discoverability < 7) {
      insights.push("Tool descriptions may need improvement for better discoverability");
    }
    
    if (metrics.learnability < 7) {
      insights.push("Users may struggle to learn the tool effectively");
    }
    
    if (metrics.efficiency < 7) {
      insights.push("Tool usage may not be optimally efficient");
    }
    
    if (metrics.errorPrevention < 7) {
      insights.push("Error prevention mechanisms could be strengthened");
    }
    
    if (metrics.domainAlignment < 7) {
      insights.push("Tool may not fully align with domain-specific needs");
    }
    
    return insights;
  }

  private generateUsabilityRecommendations(metrics: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.discoverability < 7) {
      recommendations.push("Enhance tool descriptions with clearer use cases and examples");
    }
    
    if (metrics.learnability < 7) {
      recommendations.push("Add onboarding examples and progressive disclosure of features");
    }
    
    if (metrics.efficiency < 7) {
      recommendations.push("Optimize tool parameters and reduce required steps");
    }
    
    if (metrics.errorPrevention < 7) {
      recommendations.push("Improve parameter validation and provide better error messages");
    }
    
    if (metrics.domainAlignment < 7) {
      recommendations.push("Consider domain-specific tool variants or configurations");
    }
    
    return recommendations;
  }

  private analyzeDomainSpecificUsability(testResult: any, scenario: string): any {
    const domainAnalysis: Record<string, { strengths: string[]; weaknesses: string[]; suggestions: string[] }> = {
      [scenario]: {
        strengths: [] as string[],
        weaknesses: [] as string[],
        suggestions: [] as string[]
      }
    };
    
    // Domain-specific analysis based on the scenario
    switch (scenario) {
      case 'phenomenological-research':
        domainAnalysis[scenario].strengths = [
          "Supports rich experiential data capture",
          "Enables pattern analysis across experiences"
        ];
        domainAnalysis[scenario].suggestions = [
          "Add support for research question framing",
          "Include citation and reference management"
        ];
        break;
        
      case 'therapeutic-practice':
        domainAnalysis[scenario].strengths = [
          "Captures nuanced emotional experiences",
          "Supports clinical documentation"
        ];
        domainAnalysis[scenario].suggestions = [
          "Add HIPAA compliance features",
          "Include therapeutic framework templates"
        ];
        break;
        
      // Add more domain-specific analysis...
    }
    
    return domainAnalysis;
  }

  // === ENHANCED TEST REPORTING ===
  
  private printUsabilityReport(testResult: any, scenario: string): void {
    const usabilityAnalysis = this.analyzeUsability(testResult, scenario);
    
    console.log('\n📊 USABILITY ANALYSIS REPORT');
    console.log('='.repeat(50));
    
    console.log('\n🎯 Usability Metrics (0-10 scale):');
    console.log(`  Discoverability: ${usabilityAnalysis.metrics.discoverability.toFixed(1)}/10`);
    console.log(`  Learnability: ${usabilityAnalysis.metrics.learnability.toFixed(1)}/10`);
    console.log(`  Efficiency: ${usabilityAnalysis.metrics.efficiency.toFixed(1)}/10`);
    console.log(`  Error Prevention: ${usabilityAnalysis.metrics.errorPrevention.toFixed(1)}/10`);
    console.log(`  Error Recovery: ${usabilityAnalysis.metrics.errorRecovery.toFixed(1)}/10`);
    console.log(`  Satisfaction: ${usabilityAnalysis.metrics.satisfaction.toFixed(1)}/10`);
    console.log(`  Domain Alignment: ${usabilityAnalysis.metrics.domainAlignment.toFixed(1)}/10`);
    
    if (usabilityAnalysis.insights.length > 0) {
      console.log('\n💡 Key Insights:');
      usabilityAnalysis.insights.forEach((insight: string) => console.log(`  • ${insight}`));
    }
    
    if (usabilityAnalysis.recommendations.length > 0) {
      console.log('\n🚀 Recommendations:');
      usabilityAnalysis.recommendations.forEach((rec: string) => console.log(`  • ${rec}`));
    }
    
    const domainFeedback = usabilityAnalysis.domainSpecificFeedback[scenario];
    if (domainFeedback) {
      console.log(`\n🎯 Domain-Specific Feedback (${scenario}):`);
      if (domainFeedback.strengths.length > 0) {
        console.log('  Strengths:');
        domainFeedback.strengths.forEach((strength: string) => console.log(`    ✓ ${strength}`));
      }
      if (domainFeedback.suggestions.length > 0) {
        console.log('  Suggestions:');
        domainFeedback.suggestions.forEach((suggestion: string) => console.log(`    💡 ${suggestion}`));
      }
    }
  }

  // === FILE OUTPUT CAPABILITIES ===
  
  private ensureOutputDirectory(): string {
    const outputDir = join(process.cwd(), 'test-results');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    return outputDir;
  }

  private saveTestResult(testResult: any, scenario: string): void {
    const outputDir = this.ensureOutputDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${scenario}-${timestamp}.json`;
    const filepath = join(outputDir, filename);
    
    // Prepare the complete test result data
    const completeResult = {
      metadata: {
        scenario,
        timestamp: new Date().toISOString(),
        testDuration: testResult.endTime.getTime() - testResult.startTime.getTime(),
        toolVersion: "1.0.0",
        model: "claude-3-5-sonnet-20241022"
      },
      testResult,
      usabilityAnalysis: this.analyzeUsability(testResult, scenario),
      summary: {
        success: testResult.success,
        totalToolCalls: testResult.toolCalls.length,
        successfulToolCalls: testResult.toolCalls.filter((tc: any) => tc.success).length,
        errorCount: testResult.errors.length,
        averageUsabilityScore: this.calculateAverageUsabilityScore(testResult, scenario)
      }
    };
    
    try {
      writeFileSync(filepath, JSON.stringify(completeResult, null, 2));
      console.log(`\n💾 Test results saved to: ${filepath}`);
    } catch (error) {
      console.error(`❌ Failed to save test results: ${error}`);
    }
  }

  private saveUsabilityReport(testResult: any, scenario: string): void {
    const outputDir = this.ensureOutputDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `usability-${scenario}-${timestamp}.json`;
    const filepath = join(outputDir, filename);
    
    const usabilityAnalysis = this.analyzeUsability(testResult, scenario);
    const report = {
      metadata: {
        scenario,
        timestamp: new Date().toISOString(),
        analysisType: "usability"
      },
      metrics: usabilityAnalysis.metrics,
      insights: usabilityAnalysis.insights,
      recommendations: usabilityAnalysis.recommendations,
      domainSpecificFeedback: usabilityAnalysis.domainSpecificFeedback,
      rawData: {
        toolCalls: testResult.toolCalls,
        errors: testResult.errors,
        duration: testResult.endTime.getTime() - testResult.startTime.getTime()
      }
    };
    
    try {
      writeFileSync(filepath, JSON.stringify(report, null, 2));
      console.log(`💾 Usability report saved to: ${filepath}`);
    } catch (error) {
      console.error(`❌ Failed to save usability report: ${error}`);
    }
  }

  private saveComparisonReport(): void {
    if (this.testResults.length === 0) return;
    
    const outputDir = this.ensureOutputDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `comparison-report-${timestamp}.json`;
    const filepath = join(outputDir, filename);
    
    const comparison = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalScenarios: this.testResults.length,
        reportType: "comparison"
      },
      scenarioComparison: this.testResults.map(result => ({
        scenario: result.scenario,
        success: result.success,
        duration: result.endTime.getTime() - result.startTime.getTime(),
        toolCalls: result.toolCalls.length,
        successfulCalls: result.toolCalls.filter((tc: any) => tc.success).length,
        errorCount: result.errors.length,
        usabilityMetrics: this.analyzeUsability(result, result.scenario).metrics
      })),
      overallMetrics: {
        totalSuccessRate: this.testResults.filter(r => r.success).length / this.testResults.length,
        averageDuration: this.testResults.reduce((sum, r) => 
          sum + (r.endTime.getTime() - r.startTime.getTime()), 0) / this.testResults.length,
        totalToolCalls: this.testResults.reduce((sum, r) => sum + r.toolCalls.length, 0),
        totalErrors: this.testResults.reduce((sum, r) => sum + r.errors.length, 0)
      },
      recommendations: this.generateOverallRecommendations()
    };
    
    try {
      writeFileSync(filepath, JSON.stringify(comparison, null, 2));
      console.log(`💾 Comparison report saved to: ${filepath}`);
    } catch (error) {
      console.error(`❌ Failed to save comparison report: ${error}`);
    }
  }

  private calculateAverageUsabilityScore(testResult: any, scenario: string): number {
    const usabilityAnalysis = this.analyzeUsability(testResult, scenario);
    const metrics = usabilityAnalysis.metrics;
    const scores = Object.values(metrics).filter(score => typeof score === 'number');
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  private generateOverallRecommendations(): string[] {
    const recommendations: string[] = [];
    
    // Analyze patterns across all test results
    const domainScenarios = this.testResults.filter(r => 
      ['phenomenological-research', 'therapeutic-practice', 'ux-research', 
       'educational-assessment', 'personal-development'].includes(r.scenario)
    );
    
    if (domainScenarios.length > 0) {
      const avgUsabilityScores = domainScenarios.map(r => 
        this.calculateAverageUsabilityScore(r, r.scenario)
      );
      const avgScore = avgUsabilityScores.reduce((sum, score) => sum + score, 0) / avgUsabilityScores.length;
      
      if (avgScore < 7) {
        recommendations.push("Overall usability scores are below target. Consider comprehensive UX improvements.");
      }
      
      const errorRates = domainScenarios.map(r => r.errors.length / Math.max(r.toolCalls.length, 1));
      const avgErrorRate = errorRates.reduce((sum, rate) => sum + rate, 0) / errorRates.length;
      
      if (avgErrorRate > 0.2) {
        recommendations.push("High error rates detected. Focus on error prevention and recovery mechanisms.");
      }
    }
    
    return recommendations;
  }

  // === ENHANCED ANALYSIS METHODS ===

  private analyzeIntegrationResults(): any {
    if (this.testResults.length === 0) {
      return { error: "No test results to analyze" };
    }

    const performanceMetrics = this.calculatePerformanceMetrics();
    const usabilityAnalysis = this.calculateOverallUsabilityMetrics();
    const toolUsagePatterns = this.analyzeToolUsagePatterns();
    const errorAnalysis = this.analyzeErrorPatterns();
    const domainEffectiveness = this.analyzeDomainEffectiveness();
    const learningCurveAnalysis = this.analyzeLearningCurves();

    const analysis = {
      metadata: {
        timestamp: new Date().toISOString(),
        totalScenarios: this.testResults.length,
        analysisType: "comprehensive_integration_analysis"
      },
      performanceMetrics,
      usabilityAnalysis,
      toolUsagePatterns,
      errorAnalysis,
      domainEffectiveness,
      learningCurveAnalysis,
      recommendations: this.generateComprehensiveRecommendations(performanceMetrics, usabilityAnalysis, toolUsagePatterns, errorAnalysis),
      insights: this.generateIntegrationInsights(performanceMetrics, usabilityAnalysis, learningCurveAnalysis, domainEffectiveness)
    };

    return analysis;
  }

  private calculatePerformanceMetrics(): any {
    const metrics = {
      successRate: this.testResults.filter(r => r.success).length / this.testResults.length,
      averageDuration: this.testResults.reduce((sum, r) => 
        sum + (r.endTime.getTime() - r.startTime.getTime()), 0) / this.testResults.length,
      totalToolCalls: this.testResults.reduce((sum, r) => sum + r.toolCalls.length, 0),
      successfulToolCalls: this.testResults.reduce((sum, r) => 
        sum + r.toolCalls.filter((tc: any) => tc.success).length, 0),
      toolCallSuccessRate: 0,
      averageToolCallsPerScenario: 0,
      errorRate: this.testResults.reduce((sum, r) => sum + r.errors.length, 0) / 
                this.testResults.reduce((sum, r) => sum + r.toolCalls.length, 1)
    };

    metrics.toolCallSuccessRate = metrics.successfulToolCalls / Math.max(metrics.totalToolCalls, 1);
    metrics.averageToolCallsPerScenario = metrics.totalToolCalls / this.testResults.length;

    return metrics;
  }

  private calculateOverallUsabilityMetrics(): any {
    const domainScenarios = this.testResults.filter(r => 
      ['phenomenological-research', 'therapeutic-practice', 'ux-research', 
       'educational-assessment', 'personal-development'].includes(r.scenario)
    );

    if (domainScenarios.length === 0) {
      return { note: "No domain-specific scenarios found for usability analysis" };
    }

    const usabilityScores = domainScenarios.map(r => {
      const analysis = this.analyzeUsability(r, r.scenario);
      return {
        scenario: r.scenario,
        metrics: analysis.metrics,
        averageScore: this.calculateAverageUsabilityScore(r, r.scenario)
      };
    });

    const overallScores = {
      discoverability: usabilityScores.reduce((sum, s) => sum + s.metrics.discoverability, 0) / usabilityScores.length,
      learnability: usabilityScores.reduce((sum, s) => sum + s.metrics.learnability, 0) / usabilityScores.length,
      efficiency: usabilityScores.reduce((sum, s) => sum + s.metrics.efficiency, 0) / usabilityScores.length,
      errorPrevention: usabilityScores.reduce((sum, s) => sum + s.metrics.errorPrevention, 0) / usabilityScores.length,
      satisfaction: usabilityScores.reduce((sum, s) => sum + s.metrics.satisfaction, 0) / usabilityScores.length,
      domainAlignment: usabilityScores.reduce((sum, s) => sum + s.metrics.domainAlignment, 0) / usabilityScores.length
    };

    return {
      scenarioScores: usabilityScores,
      overallScores,
      averageOverallScore: Object.values(overallScores).reduce((sum, score) => sum + score, 0) / Object.keys(overallScores).length
    };
  }

  private analyzeToolUsagePatterns(): any {
    const toolUsage: { [key: string]: { count: number; successCount: number; scenarios: string[] } } = {};
    
    this.testResults.forEach(result => {
      result.toolCalls.forEach((call: any) => {
        if (!toolUsage[call.tool]) {
          toolUsage[call.tool] = { count: 0, successCount: 0, scenarios: [] };
        }
        toolUsage[call.tool].count++;
        if (call.success) toolUsage[call.tool].successCount++;
        if (!toolUsage[call.tool].scenarios.includes(result.scenario)) {
          toolUsage[call.tool].scenarios.push(result.scenario);
        }
      });
    });

    const toolAnalysis = Object.entries(toolUsage).map(([tool, usage]) => ({
      tool,
      usageCount: usage.count,
      successRate: usage.successCount / usage.count,
      scenarioCoverage: usage.scenarios.length,
      scenarios: usage.scenarios
    }));

    return {
      toolUsage,
      toolAnalysis,
      mostUsedTool: toolAnalysis.reduce((max, tool) => tool.usageCount > max.usageCount ? tool : max),
      leastUsedTool: toolAnalysis.reduce((min, tool) => tool.usageCount < min.usageCount ? tool : min),
      mostSuccessfulTool: toolAnalysis.reduce((max, tool) => tool.successRate > max.successRate ? tool : max)
    };
  }

  private analyzeErrorPatterns(): any {
    const errorPatterns: { [key: string]: { count: number; scenarios: string[]; toolCalls: any[] } } = {};
    
    this.testResults.forEach(result => {
      result.errors.forEach((error: string) => {
        const errorType = this.categorizeError(error);
        if (!errorPatterns[errorType]) {
          errorPatterns[errorType] = { count: 0, scenarios: [], toolCalls: [] };
        }
        errorPatterns[errorType].count++;
        if (!errorPatterns[errorType].scenarios.includes(result.scenario)) {
          errorPatterns[errorType].scenarios.push(result.scenario);
        }
      });

      result.toolCalls.forEach((call: any) => {
        if (!call.success && call.error) {
          const errorType = this.categorizeError(call.error);
          if (!errorPatterns[errorType]) {
            errorPatterns[errorType] = { count: 0, scenarios: [], toolCalls: [] };
          }
          errorPatterns[errorType].toolCalls.push(call);
        }
      });
    });

    const totalErrors = this.testResults.reduce((sum, r) => sum + r.errors.length, 0);
    const mostCommonError = Object.entries(errorPatterns).reduce((max, [type, pattern]) => 
      pattern.count > max.count ? { type, count: pattern.count, scenarios: pattern.scenarios, toolCalls: pattern.toolCalls } : max, 
      { type: '', count: 0, scenarios: [] as string[], toolCalls: [] as any[] });

    return {
      errorPatterns,
      totalErrors,
      mostCommonError,
      errorDistribution: Object.entries(errorPatterns).map(([type, pattern]) => ({
        type,
        count: pattern.count,
        percentage: (pattern.count / Math.max(totalErrors, 1)) * 100
      }))
    };
  }

  private categorizeError(error: string): string {
    if (error.includes('validation') || error.includes('invalid')) return 'Validation Error';
    if (error.includes('not found') || error.includes('missing')) return 'Resource Error';
    if (error.includes('timeout') || error.includes('connection')) return 'Connection Error';
    if (error.includes('permission') || error.includes('access')) return 'Permission Error';
    if (error.includes('format') || error.includes('parsing')) return 'Format Error';
    return 'General Error';
  }

  private analyzeDomainEffectiveness(): any {
    const domainScenarios = ['phenomenological-research', 'therapeutic-practice', 'ux-research', 'educational-assessment'];
    const domainAnalysis: { [key: string]: any } = {};

    domainScenarios.forEach(domain => {
      const domainResults = this.testResults.filter(r => r.scenario === domain);
      if (domainResults.length > 0) {
        const result = domainResults[0]; // Assuming one test per domain
        const usabilityAnalysis = this.analyzeUsability(result, domain);
        
        domainAnalysis[domain] = {
          success: result.success,
          toolCalls: result.toolCalls.length,
          successfulCalls: result.toolCalls.filter((tc: any) => tc.success).length,
          errors: result.errors.length,
          usabilityScore: this.calculateAverageUsabilityScore(result, domain),
          usabilityMetrics: usabilityAnalysis.metrics,
          effectiveness: this.calculateDomainEffectiveness(result, domain)
        };
      }
    });

    return {
      domainAnalysis,
      bestPerformingDomain: Object.entries(domainAnalysis).reduce((max, [domain, analysis]) => 
        analysis.effectiveness > max.effectiveness ? { domain, ...analysis } : max, 
        { domain: '', effectiveness: 0 }),
      domainComparison: Object.entries(domainAnalysis).map(([domain, analysis]) => ({
        domain,
        effectiveness: analysis.effectiveness,
        usabilityScore: analysis.usabilityScore,
        successRate: analysis.successfulCalls / Math.max(analysis.toolCalls, 1)
      }))
    };
  }

  private calculateDomainEffectiveness(result: any, domain: string): number {
    const baseScore = result.success ? 8 : 4;
    const toolCallBonus = Math.min(result.toolCalls.filter((tc: any) => tc.success).length * 0.5, 2);
    const errorPenalty = Math.min(result.errors.length * 0.5, 3);
    const usabilityBonus = this.calculateAverageUsabilityScore(result, domain) * 0.1;
    
    return Math.max(0, Math.min(10, baseScore + toolCallBonus - errorPenalty + usabilityBonus));
  }

  private analyzeLearningCurves(): any {
    const learningData = this.testResults.map((result, index) => ({
      scenario: result.scenario,
      order: index,
      toolCalls: result.toolCalls.length,
      successfulCalls: result.toolCalls.filter((tc: any) => tc.success).length,
      errors: result.errors.length,
      duration: result.endTime.getTime() - result.startTime.getTime(),
      usabilityScore: this.calculateAverageUsabilityScore(result, result.scenario)
    }));

    const learningTrend = this.calculateLearningTrend(learningData);
    
    return {
      learningData,
      learningTrend,
      improvementRate: this.calculateImprovementRate(learningData),
      consistencyScore: this.calculateConsistencyScore(learningData)
    };
  }

  private calculateLearningTrend(learningData: any[]): string {
    if (learningData.length < 2) return 'Insufficient data';
    
    const earlyScores = learningData.slice(0, Math.ceil(learningData.length / 2))
      .map(d => d.usabilityScore);
    const lateScores = learningData.slice(Math.ceil(learningData.length / 2))
      .map(d => d.usabilityScore);
    
    const earlyAvg = earlyScores.reduce((sum, score) => sum + score, 0) / earlyScores.length;
    const lateAvg = lateScores.reduce((sum, score) => sum + score, 0) / lateScores.length;
    
    if (lateAvg > earlyAvg + 1) return 'Improving';
    if (lateAvg < earlyAvg - 1) return 'Declining';
    return 'Stable';
  }

  private calculateImprovementRate(learningData: any[]): number {
    if (learningData.length < 2) return 0;
    
    const firstHalf = learningData.slice(0, Math.ceil(learningData.length / 2));
    const secondHalf = learningData.slice(Math.ceil(learningData.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, d) => sum + d.usabilityScore, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, d) => sum + d.usabilityScore, 0) / secondHalf.length;
    
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  }

  private calculateConsistencyScore(learningData: any[]): number {
    if (learningData.length < 2) return 10;
    
    const scores = learningData.map(d => d.usabilityScore);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Higher consistency = lower standard deviation
    return Math.max(0, 10 - standardDeviation);
  }

  private generateComprehensiveRecommendations(performanceMetrics: any, usabilityAnalysis: any, toolUsagePatterns: any, errorAnalysis: any): any {
    const recommendations: {
      performance: string[];
      usability: string[];
      toolImprovements: string[];
      errorHandling: string[];
      domainSpecific: string[];
    } = {
      performance: [],
      usability: [],
      toolImprovements: [],
      errorHandling: [],
      domainSpecific: []
    };

    // Performance recommendations
    if (performanceMetrics.successRate < 0.8) {
      recommendations.performance.push("Improve overall success rate through better error handling and validation");
    }
    if (performanceMetrics.toolCallSuccessRate < 0.9) {
      recommendations.performance.push("Enhance tool reliability and parameter validation");
    }
    if (performanceMetrics.errorRate > 0.1) {
      recommendations.performance.push("Reduce error rates through improved input validation and error recovery");
    }

    // Usability recommendations
    if (usabilityAnalysis.overallScores) {
      if (usabilityAnalysis.overallScores.discoverability < 7) {
        recommendations.usability.push("Improve tool discoverability through better descriptions and examples");
      }
      if (usabilityAnalysis.overallScores.learnability < 7) {
        recommendations.usability.push("Enhance learnability with better onboarding and progressive disclosure");
      }
      if (usabilityAnalysis.overallScores.efficiency < 7) {
        recommendations.usability.push("Optimize workflow efficiency and reduce cognitive load");
      }
    }

    // Tool-specific recommendations
    if (toolUsagePatterns.leastUsedTool) {
      recommendations.toolImprovements.push(`Consider improving ${toolUsagePatterns.leastUsedTool.tool} discoverability or functionality`);
    }
    if (toolUsagePatterns.mostSuccessfulTool && toolUsagePatterns.mostSuccessfulTool.successRate < 0.95) {
      recommendations.toolImprovements.push(`Enhance ${toolUsagePatterns.mostSuccessfulTool.tool} reliability`);
    }

    // Error handling recommendations
    if (errorAnalysis.mostCommonError) {
      recommendations.errorHandling.push(`Address ${errorAnalysis.mostCommonError.type} errors through improved validation`);
    }

    return recommendations;
  }

  private generateIntegrationInsights(performanceMetrics: any, usabilityAnalysis: any, learningCurveAnalysis: any, domainEffectiveness: any): string[] {
    const insights: string[] = [];

    // Performance insights
    if (performanceMetrics.successRate > 0.9) {
      insights.push("High overall success rate indicates robust system reliability");
    }
    if (performanceMetrics.toolCallSuccessRate > 0.95) {
      insights.push("Excellent tool execution success rate suggests well-designed tool interfaces");
    }

    // Usability insights
    if (usabilityAnalysis.overallScores) {
      if (usabilityAnalysis.overallScores.domainAlignment > 8) {
        insights.push("Strong domain alignment indicates effective tool design for target use cases");
      }
      if (usabilityAnalysis.overallScores.satisfaction > 8) {
        insights.push("High user satisfaction suggests intuitive and valuable tool interactions");
      }
    }

    // Learning curve insights
    if (learningCurveAnalysis.learningTrend === 'Improving') {
      insights.push("Positive learning curve indicates effective tool design and user adaptation");
    }
    if (learningCurveAnalysis.consistencyScore > 8) {
      insights.push("High consistency in performance suggests reliable and predictable tool behavior");
    }

    // Domain effectiveness insights
    if (domainEffectiveness.bestPerformingDomain) {
      insights.push(`${domainEffectiveness.bestPerformingDomain.domain} shows highest effectiveness, indicating strong domain fit`);
    }

    return insights;
  }

  // === ENHANCED REPORTING METHODS ===

  private saveComprehensiveAnalysis(): void {
    const analysis = this.analyzeIntegrationResults();
    const outputDir = this.ensureOutputDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `comprehensive-analysis-${timestamp}.json`;
    const filepath = join(outputDir, filename);

    try {
      writeFileSync(filepath, JSON.stringify(analysis, null, 2));
      console.log(`💾 Comprehensive analysis saved to: ${filepath}`);
    } catch (error) {
      console.error(`❌ Failed to save comprehensive analysis: ${error}`);
    }
  }

  private generateMarkdownReport(): string {
    const analysis = this.analyzeIntegrationResults();
    
    let markdown = `# Bridge MCP Integration Test Analysis Report\n\n`;
    markdown += `**Generated:** ${new Date().toISOString()}\n`;
    markdown += `**Total Scenarios:** ${analysis.metadata.totalScenarios}\n\n`;

    // Performance Summary
    markdown += `## Performance Summary\n\n`;
    markdown += `- **Success Rate:** ${(analysis.performanceMetrics.successRate * 100).toFixed(1)}%\n`;
    markdown += `- **Tool Call Success Rate:** ${(analysis.performanceMetrics.toolCallSuccessRate * 100).toFixed(1)}%\n`;
    markdown += `- **Average Duration:** ${analysis.performanceMetrics.averageDuration.toFixed(0)}ms\n`;
    markdown += `- **Total Tool Calls:** ${analysis.performanceMetrics.totalToolCalls}\n`;
    markdown += `- **Error Rate:** ${(analysis.performanceMetrics.errorRate * 100).toFixed(1)}%\n\n`;

    // Usability Analysis
    if (analysis.usabilityAnalysis.overallScores) {
      markdown += `## Usability Analysis\n\n`;
      markdown += `| Metric | Score |\n|--------|-------|\n`;
      Object.entries(analysis.usabilityAnalysis.overallScores).forEach(([metric, score]) => {
        const scoreValue = score as number;
        markdown += `| ${metric.charAt(0).toUpperCase() + metric.slice(1)} | ${scoreValue.toFixed(1)}/10 |\n`;
      });
      markdown += `\n**Average Usability Score:** ${analysis.usabilityAnalysis.averageOverallScore.toFixed(1)}/10\n\n`;
    }

    // Tool Usage Analysis
    markdown += `## Tool Usage Analysis\n\n`;
    markdown += `| Tool | Usage Count | Success Rate | Scenarios |\n|------|-------------|--------------|-----------|\n`;
    analysis.toolUsagePatterns.toolAnalysis.forEach((tool: any) => {
      markdown += `| ${tool.tool} | ${tool.usageCount} | ${(tool.successRate * 100).toFixed(1)}% | ${tool.scenarioCoverage} |\n`;
    });
    markdown += `\n`;

    // Error Analysis
    markdown += `## Error Analysis\n\n`;
    markdown += `| Error Type | Count | Percentage |\n|------------|-------|------------|\n`;
    analysis.errorAnalysis.errorDistribution.forEach((error: any) => {
      markdown += `| ${error.type} | ${error.count} | ${error.percentage.toFixed(1)}% |\n`;
    });
    markdown += `\n`;

    // Domain Effectiveness
    markdown += `## Domain Effectiveness\n\n`;
    markdown += `| Domain | Effectiveness | Usability Score | Success Rate |\n|--------|---------------|-----------------|--------------|\n`;
    analysis.domainEffectiveness.domainComparison.forEach((domain: any) => {
      markdown += `| ${domain.domain} | ${domain.effectiveness.toFixed(1)}/10 | ${domain.usabilityScore.toFixed(1)}/10 | ${(domain.successRate * 100).toFixed(1)}% |\n`;
    });
    markdown += `\n`;

    // Learning Curve Analysis
    markdown += `## Learning Curve Analysis\n\n`;
    markdown += `- **Learning Trend:** ${analysis.learningCurveAnalysis.learningTrend}\n`;
    markdown += `- **Improvement Rate:** ${analysis.learningCurveAnalysis.improvementRate.toFixed(1)}%\n`;
    markdown += `- **Consistency Score:** ${analysis.learningCurveAnalysis.consistencyScore.toFixed(1)}/10\n\n`;

    // Recommendations
    markdown += `## Recommendations\n\n`;
    Object.entries(analysis.recommendations).forEach(([category, recs]) => {
      const recsArr = recs as string[];
      if (recsArr.length > 0) {
        markdown += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
        recsArr.forEach((rec: string) => {
          markdown += `- ${rec}\n`;
        });
        markdown += `\n`;
      }
    });

    // Key Insights
    markdown += `## Key Insights\n\n`;
    analysis.insights.forEach((insight: string) => {
      markdown += `- ${insight}\n`;
    });

    return markdown;
  }

  private saveMarkdownReport(): void {
    const markdown = this.generateMarkdownReport();
    const outputDir = this.ensureOutputDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `integration-analysis-report-${timestamp}.md`;
    const filepath = join(outputDir, filename);

    try {
      writeFileSync(filepath, markdown);
      console.log(`💾 Markdown report saved to: ${filepath}`);
    } catch (error) {
      console.error(`❌ Failed to save markdown report: ${error}`);
    }
  }

  async connectToServer(): Promise<void> {
    try {
      console.log('🔌 Connecting to Bridge MCP server...');
      
      // Path to the built MCP server
      const serverPath = join(process.cwd(), 'dist', 'index.js');
      
      const transport = new StdioClientTransport({ 
        command: "node", 
        args: [serverPath],
        env: { ...process.env, NODE_ENV: 'test' }
      });
      
      await this.mcp.connect(transport);
      console.log('✅ Connected to MCP server successfully');
      
    } catch (error) {
      console.error('❌ Failed to connect to MCP server:', error);
      throw error;
    }
  }

  private async getAnthropicTools(): Promise<Array<{ name: string; description: string; input_schema: any }>> {
    const toolsResult = await this.mcp.listTools();
    return toolsResult.tools.map(tool => ({
      name: tool.name,
      description: tool.description || 'No description available',
      input_schema: tool.inputSchema
    }));
  }

  async runSpecificTest(scenarioName: string): Promise<void> {
    const testPrompt = TEST_SCENARIOS[scenarioName as keyof typeof TEST_SCENARIOS];
    if (!testPrompt) {
      throw new Error(`Unknown test scenario: ${scenarioName}`);
    }

    console.log(`🧠 Running test scenario: ${scenarioName}`);
    console.log('📝 Sending test prompt to Claude...\n');

    const messages = [{ role: 'user' as const, content: testPrompt }];
    const testResult: {
      scenario: string;
      startTime: Date;
      endTime?: Date;
      toolCalls: Array<{
        tool: string;
        arguments: any;
        success: boolean;
        result: any;
        error: string | null;
      }>;
      errors: string[];
      success: boolean;
    } = {
      scenario: scenarioName,
      startTime: new Date(),
      toolCalls: [],
      errors: [],
      success: true
    };

    try {
      const anthropicTools = await this.getAnthropicTools();
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: messages,
        tools: anthropicTools,
      });

      await this.processResponse(response, messages, anthropicTools, testResult);
      
    } catch (error) {
      console.error(`❌ Failed to run test scenario ${scenarioName}:`, error);
      testResult.success = false;
      testResult.errors.push(error instanceof Error ? error.message : String(error));
    }

    testResult.endTime = new Date();
    this.testResults.push(testResult);
    this.printTestSummary(testResult);
  }

  async runAllTests(): Promise<void> {
    console.log('🧠 Running all test scenarios...\n');
    
    for (const scenarioName of Object.keys(TEST_SCENARIOS)) {
      try {
        await this.runSpecificTest(scenarioName);
        console.log('\n' + '='.repeat(80) + '\n');
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Test scenario ${scenarioName} failed:`, error);
      }
    }
    
    this.printOverallSummary();
  }

  private async processResponse(response: any, messages: any[], anthropicTools: any[], testResult: any): Promise<void> {
    console.log('🤖 Processing Claude\'s response...\n');

    for (const content of response.content) {
      if (content.type === "text") {
        console.log('💬 Claude says:');
        console.log(content.text);
        console.log('\n' + '-'.repeat(40) + '\n');
        
        messages.push({ role: 'assistant', content: content.text });
        
      } else if (content.type === "tool_use") {
        console.log(`🔧 Claude wants to use tool: ${content.name}`);
        console.log(`📋 Arguments: ${JSON.stringify(content.input, null, 2)}`);
        
        const toolCall: {
          tool: string;
          arguments: any;
          success: boolean;
          result: any;
          error: string | null;
        } = {
          tool: content.name,
          arguments: content.input,
          success: false,
          result: null,
          error: null
        };
        
        try {
          const result = await this.mcp.callTool({ 
            name: content.name, 
            arguments: content.input 
          });
          
          console.log('✅ Tool executed successfully');
          console.log('📤 Result:', JSON.stringify(result, null, 2));
          
          toolCall.success = true;
          toolCall.result = result;
          testResult.toolCalls.push(toolCall);
          
          // Add tool result to conversation
          const resultText = typeof result.content === 'string' 
            ? result.content 
            : JSON.stringify(result.content);
            
          messages.push({ 
            role: 'user', 
            content: `Tool ${content.name} result: ${resultText}` 
          });

          // Let Claude continue with the result
          const followUpResponse = await this.anthropic.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 2000,
            messages: messages,
            tools: anthropicTools,
          });

          await this.processResponse(followUpResponse, messages, anthropicTools, testResult);
          
        } catch (error) {
          console.error(`❌ Tool ${content.name} failed:`, error);
          
          toolCall.error = error instanceof Error ? error.message : String(error);
          testResult.toolCalls.push(toolCall);
          testResult.errors.push(`Tool ${content.name} failed: ${toolCall.error}`);
          
          // Let Claude know about the error
          messages.push({ 
            role: 'user', 
            content: `Tool ${content.name} failed with error: ${toolCall.error}` 
          });
        }
      }
    }
  }

  private printTestSummary(testResult: any): void {
    const duration = testResult.endTime.getTime() - testResult.startTime.getTime();
    const successCount = testResult.toolCalls.filter((tc: any) => tc.success).length;
    const totalCalls = testResult.toolCalls.length;
    
    console.log(`\n📊 Test Summary for ${testResult.scenario}:`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`🔧 Tool calls: ${successCount}/${totalCalls} successful`);
    console.log(`❌ Errors: ${testResult.errors.length}`);
    
    if (testResult.errors.length > 0) {
      console.log('🚨 Error details:');
      testResult.errors.forEach((error: string) => console.log(`  - ${error}`));
    }

    // Add usability analysis for domain-specific scenarios
    const domainScenarios = [
      'phenomenological-research', 'therapeutic-practice', 'ux-research', 
      'educational-assessment', 'personal-development'
    ];
    
    if (domainScenarios.includes(testResult.scenario)) {
      this.printUsabilityReport(testResult, testResult.scenario);
      this.saveUsabilityReport(testResult, testResult.scenario);
    }
    
    // Save test results to file
    this.saveTestResult(testResult, testResult.scenario);
  }

  public printOverallSummary(): void {
    console.log('\n🎯 Overall Test Summary:');
    console.log(`📊 Total scenarios: ${this.testResults.length}`);
    console.log(`✅ Successful scenarios: ${this.testResults.filter(r => r.success).length}`);
    console.log(`❌ Failed scenarios: ${this.testResults.filter(r => !r.success).length}`);
    
    const totalToolCalls = this.testResults.reduce((sum, r) => sum + r.toolCalls.length, 0);
    const successfulToolCalls = this.testResults.reduce((sum, r) => 
      sum + r.toolCalls.filter((tc: any) => tc.success).length, 0);
    
    console.log(`🔧 Total tool calls: ${successfulToolCalls}/${totalToolCalls} successful`);
    
    // Generate comprehensive analysis
    console.log('\n📈 Generating comprehensive analysis...');
    const analysis = this.analyzeIntegrationResults();
    
    // Print key metrics
    console.log('\n📊 Key Performance Metrics:');
    console.log(`   Success Rate: ${(analysis.performanceMetrics.successRate * 100).toFixed(1)}%`);
    console.log(`   Tool Call Success Rate: ${(analysis.performanceMetrics.toolCallSuccessRate * 100).toFixed(1)}%`);
    console.log(`   Average Duration: ${analysis.performanceMetrics.averageDuration.toFixed(0)}ms`);
    console.log(`   Error Rate: ${(analysis.performanceMetrics.errorRate * 100).toFixed(1)}%`);
    
    // Print usability summary if available
    if (analysis.usabilityAnalysis.overallScores) {
      console.log('\n🎯 Usability Summary:');
      console.log(`   Average Usability Score: ${analysis.usabilityAnalysis.averageOverallScore.toFixed(1)}/10`);
      Object.entries(analysis.usabilityAnalysis.overallScores).forEach(([metric, score]) => {
        const scoreValue = score as number;
        console.log(`   ${metric.charAt(0).toUpperCase() + metric.slice(1)}: ${scoreValue.toFixed(1)}/10`);
      });
    }
    
    // Print tool usage summary
    console.log('\n🔧 Tool Usage Summary:');
    analysis.toolUsagePatterns.toolAnalysis.forEach((tool: any) => {
      console.log(`   ${tool.tool}: ${tool.usageCount} calls, ${(tool.successRate * 100).toFixed(1)}% success`);
    });
    
    // Print learning curve summary
    console.log('\n📈 Learning Curve Analysis:');
    console.log(`   Trend: ${analysis.learningCurveAnalysis.learningTrend}`);
    console.log(`   Improvement Rate: ${analysis.learningCurveAnalysis.improvementRate.toFixed(1)}%`);
    console.log(`   Consistency Score: ${analysis.learningCurveAnalysis.consistencyScore.toFixed(1)}/10`);
    
    // Print key insights
    if (analysis.insights.length > 0) {
      console.log('\n💡 Key Insights:');
      analysis.insights.forEach((insight: string) => {
        console.log(`   • ${insight}`);
      });
    }
    
    // Print top recommendations
    console.log('\n🎯 Top Recommendations:');
    Object.entries(analysis.recommendations).forEach(([category, recs]) => {
      const recsArr = recs as string[];
      if (recsArr.length > 0) {
        console.log(`   ${category.charAt(0).toUpperCase() + category.slice(1)}:`);
        recsArr.slice(0, 2).forEach((rec: string) => {
          console.log(`     • ${rec}`);
        });
      }
    });
    
    // Save all reports
    this.saveComparisonReport();
    this.saveComprehensiveAnalysis();
    this.saveMarkdownReport();
  }

  async getToolDefinitions(): Promise<string> {
    try {
      console.log('📋 Fetching tool definitions...');
      const toolsResult = await this.mcp.listTools();
      
      const toolDescriptions = toolsResult.tools.map(tool => {
        const schemaStr = JSON.stringify(tool.inputSchema, null, 2);
        return `**${tool.name}**
Description: ${tool.description}
Input Schema: \`\`\`json\n${schemaStr}\n\`\`\`
`;
      }).join('\n\n');

      console.log(`✅ Found ${toolsResult.tools.length} tools`);
      return toolDescriptions;
      
    } catch (error) {
      console.error('❌ Failed to get tool definitions:', error);
      throw error;
    }
  }

  async cleanup(): Promise<void> {
    try {
      await this.mcp.close();
      console.log('🧹 Cleanup completed');
    } catch (error) {
      console.error('⚠️ Cleanup warning:', error);
    }
  }

  async runBatchMigration(experiencerName: string, batchSize: number = 5): Promise<void> {
    console.log(`🔄 Starting batch migration for experiencer: ${experiencerName}`);
    
    try {
      // Read and filter sources
      const allSources = readBridgeDatabase();
      console.log(`📊 Found ${allSources.length} total sources in database`);
      
      const experiencerSources = filterSourcesByExperiencer(allSources, experiencerName);
      console.log(`👤 Found ${experiencerSources.length} sources for experiencer: ${experiencerName}`);
      
      const sourcesNeedingMigration = experiencerSources.filter(needsMigration);
      console.log(`🔄 ${sourcesNeedingMigration.length} sources need migration`);
      
      if (sourcesNeedingMigration.length === 0) {
        console.log('✅ No sources need migration for this experiencer');
        return;
      }
      
      // Create batches
      const batches = createMigrationBatch(sourcesNeedingMigration, batchSize);
      console.log(`📦 Created ${batches.length} batches of ${batchSize} sources each`);
      
      let totalProcessed = 0;
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} sources)`);
        
        // Format sources for the prompt
        const sourcesText = batch.map(formatSourceForMigration).join('\n---\n');
        
        // Create migration prompt with this batch
        const migrationPrompt = TEST_SCENARIOS['batch-migration'].replace(
          '[Sources will be provided here]',
          sourcesText
        );
        
        // Run the migration for this batch
        await this.runSpecificTestWithPrompt(`batch-migration-${batchIndex + 1}`, migrationPrompt);
        
        totalProcessed += batch.length;
        console.log(`✅ Completed batch ${batchIndex + 1}. Total processed: ${totalProcessed}/${sourcesNeedingMigration.length}`);
        
        // Small delay between batches
        if (batchIndex < batches.length - 1) {
          console.log('⏳ Waiting 2 seconds before next batch...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log(`\n🎉 Batch migration completed! Processed ${totalProcessed} sources for ${experiencerName}`);
      
    } catch (error) {
      console.error('❌ Batch migration failed:', error);
      throw error;
    }
  }

  async runSpecificTestWithPrompt(scenarioName: string, customPrompt: string): Promise<void> {
    console.log(`🧠 Running test scenario: ${scenarioName}`);
    console.log('📝 Sending custom prompt to Claude...\n');

    const messages = [{ role: 'user' as const, content: customPrompt }];
    const testResult: {
      scenario: string;
      startTime: Date;
      endTime?: Date;
      toolCalls: Array<{
        tool: string;
        arguments: any;
        success: boolean;
        result: any;
        error: string | null;
      }>;
      errors: string[];
      success: boolean;
    } = {
      scenario: scenarioName,
      startTime: new Date(),
      toolCalls: [],
      errors: [],
      success: true
    };

    try {
      const anthropicTools = await this.getAnthropicTools();
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4000,
        messages: messages,
        tools: anthropicTools,
      });

      await this.processResponse(response, messages, anthropicTools, testResult);
      
    } catch (error) {
      console.error(`❌ Failed to run test scenario ${scenarioName}:`, error);
      testResult.success = false;
      testResult.errors.push(error instanceof Error ? error.message : String(error));
    }

    testResult.endTime = new Date();
    this.testResults.push(testResult);
    this.printTestSummary(testResult);
  }
}

async function main(): Promise<void> {
  const tester = new EnhancedLLMTester();
  
  try {
    await tester.connectToServer();
    
    // Check command line arguments for specific test
    const scenario = process.argv[2];
    const experiencerName = process.argv[3]; // For migration
    const batchSize = parseInt(process.argv[4]) || 5; // For migration
    const saveToFile = process.argv.includes('--save') || process.argv.includes('-s');
    const analyzeOnly = process.argv.includes('--analyze') || process.argv.includes('-a');
    const markdownOnly = process.argv.includes('--markdown') || process.argv.includes('-m');
    
    if (scenario) {
      if (scenario === 'all') {
        await tester.runAllTests();
      } else if (scenario === 'analyze') {
        // Load existing results and analyze only
        console.log('📊 Running analysis on existing test results...');
        tester.printOverallSummary();
      } else if (scenario === 'migrate') {
        // Run batch migration
        if (!experiencerName) {
          console.log('Usage: npm run llm-integration migrate <experiencer-name> [batch-size]');
          console.log('Example: npm run llm-integration migrate Miguel 5');
          return;
        }
        await tester.runBatchMigration(experiencerName, batchSize);
      } else if (TEST_SCENARIOS[scenario as keyof typeof TEST_SCENARIOS]) {
        await tester.runSpecificTest(scenario);
      } else {
        console.log('Available test scenarios:');
        console.log('  all - Run all scenarios');
        console.log('  analyze - Analyze existing results only');
        console.log('  migrate <experiencer> [batch-size] - Run batch migration for specific experiencer');
        Object.keys(TEST_SCENARIOS).forEach(name => console.log(`  ${name}`));
        console.log('\nOptions:');
        console.log('  --save, -s - Save results to files');
        console.log('  --analyze, -a - Generate comprehensive analysis');
        console.log('  --markdown, -m - Generate markdown report');
        return;
      }
    } else {
      // Default to full integration test
      await tester.runSpecificTest('basic-capture');
    }
    
    console.log('\n🎉 LLM integration test completed!');
    
    if (saveToFile || analyzeOnly || markdownOnly) {
      console.log('\n📁 Results have been saved to the test-results/ directory');
      console.log('   - Individual test results: scenario-timestamp.json');
      console.log('   - Usability reports: usability-scenario-timestamp.json');
      console.log('   - Comparison report: comparison-report-timestamp.json');
      console.log('   - Comprehensive analysis: comprehensive-analysis-timestamp.json');
      console.log('   - Markdown report: integration-analysis-report-timestamp.md');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Run the test
main(); 