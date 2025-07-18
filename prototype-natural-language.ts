#!/usr/bin/env tsx

/**
 * Prototype: Bridge Natural Language Interface
 * 
 * This script tests the natural language interface and embedded notation
 * system from UNDEERSTAND.md.
 */

// ============================================================================
// NATURAL LANGUAGE INTERFACE
// ============================================================================

interface Experience {
  id: string;
  source: string;
  experiencer: string;
  experience: string[];
  coordinates: Record<string, number>;
  reflects?: string[];
  created: string;
}

// ============================================================================
// EMBEDDED NOTATION SYSTEM
// ============================================================================

// Embedded notation: modifier:category:value
const EMBEDDED_NOTATION_EXAMPLES = [
  'highly:mental:embodiment:0.1',
  'mostly:felt:embodiment:0.8', 
  'slightly:directed:purpose:0.4',
  'somewhat:exploratory:purpose:0.7',
  'highly:receptive:mood:0.9',
  'mostly:guarded:mood:0.2',
  'immediate:space:0.0',
  'distant:space:1.0',
  'historical:time:0.1',
  'anticipatory:time:0.9',
  'individual:others:0.1',
  'collective:others:0.9'
];

// ============================================================================
// NATURAL LANGUAGE PARSING
// ============================================================================

/**
 * Parse natural language into embedded notation
 */
function parseNaturalLanguage(text: string): string[] {
  const notations: string[] = [];
  
  // Common patterns
  const patterns = [
    // Embodiment patterns
    { regex: /\b(highly|mostly|somewhat|slightly)\s+(mental|felt)\s+embodiment\b/gi, 
      template: '$1:$2:embodiment:${value}' },
    { regex: /\b(mental|felt)\s+embodiment\b/gi, 
      template: '$1:embodiment:${value}' },
    
    // Focus patterns  
    { regex: /\b(highly|mostly|somewhat|slightly)\s+(precise|wide)\s+focus\b/gi,
      template: '$1:$2:focus:${value}' },
    { regex: /\b(precise|wide)\s+focus\b/gi,
      template: '$1:focus:${value}' },
    
    // Mood patterns
    { regex: /\b(highly|mostly|somewhat|slightly)\s+(guarded|receptive)\s+mood\b/gi,
      template: '$1:$2:mood:${value}' },
    { regex: /\b(guarded|receptive)\s+mood\b/gi,
      template: '$1:mood:${value}' },
    
    // Purpose patterns
    { regex: /\b(highly|mostly|somewhat|slightly)\s+(directed|exploratory)\s+purpose\b/gi,
      template: '$1:$2:purpose:${value}' },
    { regex: /\b(directed|exploratory)\s+purpose\b/gi,
      template: '$1:purpose:${value}' },
    
    // Space patterns
    { regex: /\b(highly|mostly|somewhat|slightly)\s+(immediate|distant)\s+space\b/gi,
      template: '$1:$2:space:${value}' },
    { regex: /\b(immediate|distant)\s+space\b/gi,
      template: '$1:space:${value}' },
    
    // Time patterns
    { regex: /\b(highly|mostly|somewhat|slightly)\s+(historical|anticipatory)\s+time\b/gi,
      template: '$1:$2:time:${value}' },
    { regex: /\b(historical|anticipatory)\s+time\b/gi,
      template: '$1:time:${value}' },
    
    // Others patterns
    { regex: /\b(highly|mostly|somewhat|slightly)\s+(individual|collective)\s+others\b/gi,
      template: '$1:$2:others:${value}' },
    { regex: /\b(individual|collective)\s+others\b/gi,
      template: '$1:others:${value}' }
  ];
  
  for (const pattern of patterns) {
    const matches = text.match(pattern.regex);
    if (matches) {
      for (const match of matches) {
        const notation = match.replace(pattern.regex, pattern.template);
        const value = extractValueFromNotation(notation);
        notations.push(notation.replace('${value}', value.toString()));
      }
    }
  }
  
  return notations;
}

function extractValueFromNotation(notation: string): number {
  // Extract value based on modifiers and categories
  const parts = notation.split(':');
  
  if (parts.length >= 3) {
    const modifier = parts[0]?.toLowerCase();
    const category = parts[1]?.toLowerCase();
    
    // Base values for categories
    const baseValues: Record<string, Record<string, number>> = {
      'embodiment': { 'mental': 0.0, 'felt': 1.0 },
      'focus': { 'precise': 0.0, 'wide': 1.0 },
      'mood': { 'guarded': 0.0, 'receptive': 1.0 },
      'purpose': { 'directed': 0.0, 'exploratory': 1.0 },
      'space': { 'immediate': 0.0, 'distant': 1.0 },
      'time': { 'historical': 0.0, 'anticipatory': 1.0 },
      'others': { 'individual': 0.0, 'collective': 1.0 }
    };
    
    const baseValue = baseValues[category]?.[parts[2]?.toLowerCase() || ''] || 0.5;
    
    // Apply modifier
    const modifierValues: Record<string, number> = {
      'highly': 0.9,
      'mostly': 0.8,
      'somewhat': 0.7,
      'slightly': 0.6
    };
    
    if (modifier && modifierValues[modifier]) {
      return modifierValues[modifier];
    }
    
    return baseValue;
  }
  
  return 0.5; // Default
}

// ============================================================================
// CONVERSATIONAL INTERFACE
// ============================================================================

/**
 * Process natural language queries about experiences
 */
function processNaturalLanguageQuery(query: string, experiences: Experience[]): any {
  const queryLower = query.toLowerCase();
  
  // Extract embedded notation from query
  const notations = parseNaturalLanguage(query);
  
  // Analyze query intent
  const intent = analyzeQueryIntent(queryLower);
  
  // Find relevant experiences
  const relevantExperiences = findRelevantExperiences(query, experiences, notations);
  
  return {
    query,
    notations,
    intent,
    relevantExperiences,
    analysis: analyzeExperiences(relevantExperiences, intent)
  };
}

function analyzeQueryIntent(query: string): any {
  const intent = {
    type: 'unknown',
    dimensions: [] as string[],
    focus: 'general'
  };
  
  // Intent patterns
  if (query.includes('pattern') || query.includes('tend') || query.includes('usually')) {
    intent.type = 'pattern_discovery';
  } else if (query.includes('when') || query.includes('time')) {
    intent.type = 'temporal_analysis';
    intent.dimensions.push('time');
  } else if (query.includes('where') || query.includes('place') || query.includes('space')) {
    intent.type = 'spatial_analysis';
    intent.dimensions.push('space');
  } else if (query.includes('how') || query.includes('feel') || query.includes('mood')) {
    intent.type = 'affective_analysis';
    intent.dimensions.push('mood');
  } else if (query.includes('why') || query.includes('purpose') || query.includes('goal')) {
    intent.type = 'purposive_analysis';
    intent.dimensions.push('purpose');
  } else if (query.includes('who') || query.includes('others') || query.includes('people')) {
    intent.type = 'social_analysis';
    intent.dimensions.push('others');
  } else if (query.includes('body') || query.includes('physical') || query.includes('embodied')) {
    intent.type = 'embodied_analysis';
    intent.dimensions.push('embodied');
  }
  
  return intent;
}

function findRelevantExperiences(query: string, experiences: Experience[], notations: string[]): Experience[] {
  const queryLower = query.toLowerCase();
  const relevant: Experience[] = [];
  
  for (const exp of experiences) {
    let score = 0;
    
    // Text similarity
    if (queryLower.includes('focus') && exp.source.toLowerCase().includes('focus')) score += 2;
    if (queryLower.includes('mood') && exp.source.toLowerCase().includes('mood')) score += 2;
    if (queryLower.includes('purpose') && exp.source.toLowerCase().includes('purpose')) score += 2;
    if (queryLower.includes('time') && exp.source.toLowerCase().includes('time')) score += 2;
    if (queryLower.includes('space') && exp.source.toLowerCase().includes('space')) score += 2;
    if (queryLower.includes('others') && exp.source.toLowerCase().includes('others')) score += 2;
    if (queryLower.includes('embodied') && exp.source.toLowerCase().includes('embodied')) score += 2;
    
    // Coordinate similarity with notations
    for (const notation of notations) {
      const coord = parseEmbeddedNotation(notation);
      if (coord && exp.coordinates[coord.dimension] !== undefined) {
        const similarity = 1 - Math.abs(exp.coordinates[coord.dimension] - coord.value);
        score += similarity;
      }
    }
    
    if (score > 0.5) {
      relevant.push({ ...exp, relevanceScore: score });
    }
  }
  
  return relevant.sort((a, b) => (b as any).relevanceScore - (a as any).relevanceScore);
}

function parseEmbeddedNotation(notation: string): { dimension: string; value: number } | null {
  const parts = notation.split(':');
  if (parts.length >= 3) {
    const dimension = parts[1];
    const value = parseFloat(parts[parts.length - 1]);
    if (!isNaN(value)) {
      return { dimension, value };
    }
  }
  return null;
}

function analyzeExperiences(experiences: Experience[], intent: any): any {
  if (experiences.length === 0) {
    return { message: 'No relevant experiences found' };
  }
  
  const analysis: any = {
    totalExperiences: experiences.length,
    patterns: {},
    insights: []
  };
  
  // Analyze patterns based on intent
  if (intent.type === 'pattern_discovery') {
    analysis.patterns = analyzePatterns(experiences);
  } else if (intent.dimensions.length > 0) {
    for (const dim of intent.dimensions) {
      analysis.patterns[dim] = analyzeDimension(experiences, dim);
    }
  }
  
  // Generate insights
  analysis.insights = generateInsights(experiences, intent);
  
  return analysis;
}

function analyzePatterns(experiences: Experience[]): any {
  const patterns: any = {};
  const dimensions = ['embodied', 'purpose', 'mood', 'others', 'time', 'space'];
  
  for (const dim of dimensions) {
    const values = experiences.map(exp => exp.coordinates[dim] || 0);
    if (values.length > 0) {
      patterns[dim] = {
        mean: values.reduce((sum, val) => sum + val, 0) / values.length,
        range: Math.max(...values) - Math.min(...values),
        distribution: analyzeDistribution(values)
      };
    }
  }
  
  return patterns;
}

function analyzeDimension(experiences: Experience[], dimension: string): any {
  const values = experiences.map(exp => exp.coordinates[dimension] || 0);
  
  return {
    mean: values.reduce((sum, val) => sum + val, 0) / values.length,
    range: Math.max(...values) - Math.min(...values),
    distribution: analyzeDistribution(values),
    examples: experiences.slice(0, 3).map(exp => ({
      source: exp.source,
      value: exp.coordinates[dimension] || 0
    }))
  };
}

function analyzeDistribution(values: number[]): any {
  const sorted = values.sort((a, b) => a - b);
  const n = sorted.length;
  
  return {
    q25: sorted[Math.floor(n * 0.25)],
    q50: sorted[Math.floor(n * 0.5)],
    q75: sorted[Math.floor(n * 0.75)],
    iqr: sorted[Math.floor(n * 0.75)] - sorted[Math.floor(n * 0.25)]
  };
}

function generateInsights(experiences: Experience[], intent: any): string[] {
  const insights: string[] = [];
  
  if (intent.type === 'pattern_discovery') {
    const patterns = analyzePatterns(experiences);
    
    // Find strongest patterns
    const strongPatterns = Object.entries(patterns)
      .filter(([_, data]: [string, any]) => data.range > 0.3)
      .sort(([_, a]: [string, any], [__, b]: [string, any]) => b.range - a.range);
    
    for (const [dimension, data] of strongPatterns.slice(0, 3)) {
      insights.push(`Strong variation in ${dimension} (range: ${data.range.toFixed(2)})`);
    }
  } else if (intent.dimensions.length > 0) {
    for (const dim of intent.dimensions) {
      const analysis = analyzeDimension(experiences, dim);
      if (analysis.range > 0.5) {
        insights.push(`High variability in ${dim} experiences`);
      } else if (analysis.range < 0.2) {
        insights.push(`Consistent ${dim} patterns`);
      }
    }
  }
  
  return insights;
}

// ============================================================================
// SYNTHETIC DATA
// ============================================================================

function generateSyntheticData(): Experience[] {
  return [
    {
      id: 'exp_001',
      source: 'Deep focus coding session with highly mental embodiment',
      experiencer: 'Human',
      experience: ['highly:mental:embodiment:0.1', 'directed:purpose:0.0'],
      coordinates: { embodied: 0.1, purpose: 0.0 },
      created: '2024-01-15T10:00:00Z'
    },
    {
      id: 'exp_002',
      source: 'Team brainstorming with collective others and exploratory purpose',
      experiencer: 'Human',
      experience: ['collective:others:0.9', 'exploratory:purpose:1.0'],
      coordinates: { others: 0.9, purpose: 1.0 },
      created: '2024-01-15T14:00:00Z'
    },
    {
      id: 'exp_003',
      source: 'Presenting to stakeholders with felt embodiment and anticipatory time',
      experiencer: 'Human',
      experience: ['felt:embodiment:1.0', 'anticipatory:time:0.9'],
      coordinates: { embodied: 1.0, time: 0.9 },
      created: '2024-01-16T09:00:00Z'
    },
    {
      id: 'exp_004',
      source: 'Painting in studio with highly receptive mood',
      experiencer: 'Human',
      experience: ['highly:receptive:mood:0.9', 'exploratory:purpose:0.8'],
      coordinates: { mood: 0.9, purpose: 0.8 },
      created: '2024-01-16T16:00:00Z'
    },
    {
      id: 'exp_005',
      source: 'Writing breakthrough with mental embodiment and receptive mood',
      experiencer: 'Human',
      experience: ['mental:embodiment:0.0', 'receptive:mood:1.0'],
      coordinates: { embodied: 0.0, mood: 1.0 },
      created: '2024-01-17T11:00:00Z'
    }
  ];
}

// ============================================================================
// MAIN PROTOTYPE
// ============================================================================

async function runNaturalLanguagePrototype() {
  console.log('🧪 Bridge Natural Language Interface Prototype\n');
  
  // Generate synthetic data
  const experiences = generateSyntheticData();
  console.log(`📊 Generated ${experiences.length} synthetic experiences\n`);
  
  // Test embedded notation parsing
  console.log('🔍 Embedded Notation Examples:\n');
  for (const notation of EMBEDDED_NOTATION_EXAMPLES) {
    const parsed = parseEmbeddedNotation(notation);
    console.log(`${notation} → ${JSON.stringify(parsed)}`);
  }
  console.log('');
  
  // Test natural language queries
  const testQueries = [
    'What patterns do I have in my embodied experiences?',
    'When do I feel most receptive?',
    'How does my purpose change throughout the day?',
    'Where do I experience collective others?',
    'Why do I feel mental embodiment during coding?'
  ];
  
  console.log('💬 Natural Language Query Processing:\n');
  for (const query of testQueries) {
    console.log(`Query: "${query}"`);
    const result = processNaturalLanguageQuery(query, experiences);
    console.log(`Intent: ${result.intent.type}`);
    console.log(`Notations: [${result.notations?.join(', ') || 'none'}]`);
    console.log(`Relevant Experiences: ${result.relevantExperiences.length}`);
    console.log(`Insights: [${result.analysis.insights?.join(', ') || 'none'}]`);
    console.log('');
  }
  
  // Test conversational flow
  console.log('🔄 Conversational Flow Example:\n');
  const conversation = [
    'What patterns do I have in my embodied experiences?',
    'Tell me more about when I feel mental embodiment',
    'How does that relate to my purpose?'
  ];
  
  for (const message of conversation) {
    console.log(`User: ${message}`);
    const result = processNaturalLanguageQuery(message, experiences);
    console.log(`Bridge: Found ${result.relevantExperiences.length} relevant experiences`);
    if (result.analysis.insights?.length > 0) {
      console.log(`Insight: ${result.analysis.insights[0]}`);
    }
    console.log('');
  }
}

// Run the prototype
runNaturalLanguagePrototype().catch(console.error); 