#!/usr/bin/env tsx

/**
 * Prototype: Bridge Semantic Coordinate System
 * 
 * This script explores the semantic coordinate system from UNDEERSTAND.md
 * before implementing it as an MCP tool.
 */



// ============================================================================
// SEMANTIC COORDINATE SYSTEM
// ============================================================================

// The 7 dimensions with their natural language mappings
const SEMANTIC_DIMENSIONS = {
  embodied: {
    name: 'Embodied Presence',
    description: 'How physicality textures the moment (mental ↔ felt)',
    scale: {
      0.0: 'mental embodiment',
      0.1: 'highly mental embodiment', 
      0.2: 'mostly mental embodiment',
      0.3: 'somewhat mental embodiment',
      0.4: 'slightly mental embodiment',
      0.5: 'mixed embodiment',
      0.6: 'slightly felt embodiment',
      0.7: 'somewhat felt embodiment',
      0.8: 'mostly felt embodiment',
      0.9: 'highly felt embodiment',
      1.0: 'felt embodiment'
    }
  },
  focus: {
    name: 'Attentional Flow',
    description: 'Direction and quality of awareness (precise ↔ wide)',
    scale: {
      0.0: 'precise focus',
      0.1: 'highly precise focus',
      0.2: 'mostly precise focus', 
      0.3: 'somewhat precise focus',
      0.4: 'slightly precise focus',
      0.5: 'balanced focus',
      0.6: 'slightly wide focus',
      0.7: 'somewhat wide focus',
      0.8: 'mostly wide focus',
      0.9: 'highly wide focus',
      1.0: 'wide focus'
    }
  },
  mood: {
    name: 'Affective Atmosphere', 
    description: 'Emotional coloring of experience (guarded ↔ receptive)',
    scale: {
      0.0: 'guarded mood',
      0.1: 'highly guarded mood',
      0.2: 'mostly guarded mood',
      0.3: 'somewhat guarded mood', 
      0.4: 'slightly guarded mood',
      0.5: 'neutral mood',
      0.6: 'slightly receptive mood',
      0.7: 'somewhat receptive mood',
      0.8: 'mostly receptive mood',
      0.9: 'highly receptive mood',
      1.0: 'receptive mood'
    }
  },
  purpose: {
    name: 'Purposive Momentum',
    description: 'Directedness or drift of the moment (directed ↔ exploratory)',
    scale: {
      0.0: 'directed purpose',
      0.1: 'highly directed purpose',
      0.2: 'mostly directed purpose',
      0.3: 'somewhat directed purpose',
      0.4: 'slightly directed purpose',
      0.5: 'flexible purpose',
      0.6: 'slightly exploratory purpose',
      0.7: 'somewhat exploratory purpose',
      0.8: 'mostly exploratory purpose',
      0.9: 'highly exploratory purpose',
      1.0: 'exploratory purpose'
    }
  },
  space: {
    name: 'Spatial Situation',
    description: 'Lived sense of place and position (immediate ↔ distant)',
    scale: {
      0.0: 'immediate space',
      0.1: 'highly immediate space',
      0.2: 'mostly immediate space',
      0.3: 'somewhat immediate space',
      0.4: 'slightly immediate space',
      0.5: 'transitional space',
      0.6: 'slightly distant space',
      0.7: 'somewhat distant space',
      0.8: 'mostly distant space',
      0.9: 'highly distant space',
      1.0: 'distant space'
    }
  },
  time: {
    name: 'Temporal Flow',
    description: 'How past and future inhabit the present (historical ↔ anticipatory)',
    scale: {
      0.0: 'historical time',
      0.1: 'highly historical time',
      0.2: 'mostly historical time',
      0.3: 'somewhat historical time',
      0.4: 'slightly historical time',
      0.5: 'present time',
      0.6: 'slightly anticipatory time',
      0.7: 'somewhat anticipatory time',
      0.8: 'mostly anticipatory time',
      0.9: 'highly anticipatory time',
      1.0: 'anticipatory time'
    }
  },
  others: {
    name: 'Intersubjective Field',
    description: 'How others presence or absence matters (individual ↔ collective)',
    scale: {
      0.0: 'individual others',
      0.1: 'highly individual others',
      0.2: 'mostly individual others',
      0.3: 'somewhat individual others',
      0.4: 'slightly individual others',
      0.5: 'connected others',
      0.6: 'slightly collective others',
      0.7: 'somewhat collective others',
      0.8: 'mostly collective others',
      0.9: 'highly collective others',
      1.0: 'collective others'
    }
  }
} as const;

// ============================================================================
// NATURAL LANGUAGE TO COORDINATE CONVERSION
// ============================================================================

// Embedded notation mapping: modifier:category:value
const EMBEDDED_NOTATION_MAP = {
  // EMBODIED
  'mental:embodiment:0.0': 0.0,
  'highly:mental:embodiment:0.1': 0.1,
  'mostly:mental:embodiment:0.2': 0.2,
  'somewhat:mental:embodiment:0.3': 0.3,
  'slightly:mental:embodiment:0.4': 0.4,
  'mixed:embodiment:0.5': 0.5,
  'slightly:felt:embodiment:0.6': 0.6,
  'somewhat:felt:embodiment:0.7': 0.7,
  'mostly:felt:embodiment:0.8': 0.8,
  'highly:felt:embodiment:0.9': 0.9,
  'felt:embodiment:1.0': 1.0,
  
  // FOCUS
  'precise:focus:0.0': 0.0,
  'highly:precise:focus:0.1': 0.1,
  'mostly:precise:focus:0.2': 0.2,
  'somewhat:precise:focus:0.3': 0.3,
  'slightly:precise:focus:0.4': 0.4,
  'balanced:focus:0.5': 0.5,
  'slightly:wide:focus:0.6': 0.6,
  'somewhat:wide:focus:0.7': 0.7,
  'mostly:wide:focus:0.8': 0.8,
  'highly:wide:focus:0.9': 0.9,
  'wide:focus:1.0': 1.0,
  
  // MOOD
  'guarded:mood:0.0': 0.0,
  'highly:guarded:mood:0.1': 0.1,
  'mostly:guarded:mood:0.2': 0.2,
  'somewhat:guarded:mood:0.3': 0.3,
  'slightly:guarded:mood:0.4': 0.4,
  'neutral:mood:0.5': 0.5,
  'slightly:receptive:mood:0.6': 0.6,
  'somewhat:receptive:mood:0.7': 0.7,
  'mostly:receptive:mood:0.8': 0.8,
  'highly:receptive:mood:0.9': 0.9,
  'receptive:mood:1.0': 1.0,
  
  // PURPOSE
  'directed:purpose:0.0': 0.0,
  'highly:directed:purpose:0.1': 0.1,
  'mostly:directed:purpose:0.2': 0.2,
  'somewhat:directed:purpose:0.3': 0.3,
  'slightly:directed:purpose:0.4': 0.4,
  'flexible:purpose:0.5': 0.5,
  'slightly:exploratory:purpose:0.6': 0.6,
  'somewhat:exploratory:purpose:0.7': 0.7,
  'mostly:exploratory:purpose:0.8': 0.8,
  'highly:exploratory:purpose:0.9': 0.9,
  'exploratory:purpose:1.0': 1.0,
  
  // SPACE
  'immediate:space:0.0': 0.0,
  'highly:immediate:space:0.1': 0.1,
  'mostly:immediate:space:0.2': 0.2,
  'somewhat:immediate:space:0.3': 0.3,
  'slightly:immediate:space:0.4': 0.4,
  'transitional:space:0.5': 0.5,
  'slightly:distant:space:0.6': 0.6,
  'somewhat:distant:space:0.7': 0.7,
  'mostly:distant:space:0.8': 0.8,
  'highly:distant:space:0.9': 0.9,
  'distant:space:1.0': 1.0,
  
  // TIME
  'historical:time:0.0': 0.0,
  'highly:historical:time:0.1': 0.1,
  'mostly:historical:time:0.2': 0.2,
  'somewhat:historical:time:0.3': 0.3,
  'slightly:historical:time:0.4': 0.4,
  'present:time:0.5': 0.5,
  'slightly:anticipatory:time:0.6': 0.6,
  'somewhat:anticipatory:time:0.7': 0.7,
  'mostly:anticipatory:time:0.8': 0.8,
  'highly:anticipatory:time:0.9': 0.9,
  'anticipatory:time:1.0': 1.0,
  
  // OTHERS
  'individual:others:0.0': 0.0,
  'highly:individual:others:0.1': 0.1,
  'mostly:individual:others:0.2': 0.2,
  'somewhat:individual:others:0.3': 0.3,
  'slightly:individual:others:0.4': 0.4,
  'connected:others:0.5': 0.5,
  'slightly:collective:others:0.6': 0.6,
  'somewhat:collective:others:0.7': 0.7,
  'mostly:collective:others:0.8': 0.8,
  'highly:collective:others:0.9': 0.9,
  'collective:others:1.0': 1.0
} as const;

// ============================================================================
// EXPERIENCE TYPES
// ============================================================================

interface Experience {
  id: string;
  source: string;
  experiencer: string;
  experience: string[]; // Natural language qualities
  coordinates?: Record<string, number>; // Converted coordinates
  reflects?: string[]; // Links to other experiences (for reflections)
  created: string;
}

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

function convertNaturalLanguageToCoordinates(qualities: string[]): Record<string, number> {
  const coordinates: Record<string, number> = {};
  
  for (const quality of qualities) {
    // Check if it's already in embedded notation
    if (quality.includes(':')) {
      const parts = quality.split(':');
      if (parts.length === 3) {
        const dimension = parts[1];
        const value = parseFloat(parts[2]);
        if (!isNaN(value) && dimension in SEMANTIC_DIMENSIONS) {
          coordinates[dimension] = value;
        }
      }
    } else {
      // Try to find a matching embedded notation
      for (const [notation, value] of Object.entries(EMBEDDED_NOTATION_MAP)) {
        const parts = notation.split(':');
        const dimension = parts[1];
        const naturalLanguage = parts[0] + ' ' + dimension;
        
        if (quality.toLowerCase().includes(naturalLanguage.replace(':', ' ').toLowerCase())) {
          coordinates[dimension] = value;
          break;
        }
      }
    }
  }
  
  return coordinates;
}



// ============================================================================
// SYNTHETIC DATA GENERATION
// ============================================================================

function generateSyntheticExperiences(): Experience[] {
  return [
    // Primary experiences
    {
      id: 'exp_001',
      source: 'Morning coffee ritual feels grounding and centering',
      experiencer: 'Human',
      experience: ['felt embodiment', 'receptive mood', 'immediate space'],
      created: '2024-01-15T08:30:00Z'
    },
    {
      id: 'exp_002', 
      source: 'Thinking through the strategy for tomorrow\'s presentation',
      experiencer: 'Human',
      experience: ['mental embodiment', 'directed purpose', 'anticipatory time'],
      created: '2024-01-15T14:20:00Z'
    },
    {
      id: 'exp_003',
      source: 'Team meeting went better than expected, felt connected and heard',
      experiencer: 'Human', 
      experience: ['collective others', 'receptive mood', 'historical time'],
      created: '2024-01-15T16:45:00Z'
    },
    {
      id: 'exp_004',
      source: 'Shoulders killing me but we\'re close to breakthrough',
      experiencer: 'Human',
      experience: ['felt embodiment', 'directed purpose', 'anticipatory time'],
      created: '2024-01-16T11:15:00Z'
    },
    {
      id: 'exp_005',
      source: 'Walking through the park, autumn leaves crunching underfoot',
      experiencer: 'Human',
      experience: ['felt embodiment', 'exploratory purpose', 'immediate space'],
      created: '2024-01-16T17:30:00Z'
    },
    
    // Reflections
    {
      id: 'exp_006',
      source: 'Realized I avoid taking action, stuck in observation mode',
      experiencer: 'Human',
      experience: ['mental embodiment', 'anticipatory time'],
      reflects: ['exp_001', 'exp_002', 'exp_004'],
      created: '2024-01-17T09:00:00Z'
    },
    {
      id: 'exp_007',
      source: 'I\'m more creative when I feel embodied and open',
      experiencer: 'Human',
      experience: ['mental embodiment', 'directed purpose'],
      reflects: ['exp_001', 'exp_005'],
      created: '2024-01-17T14:30:00Z'
    },
    {
      id: 'exp_008',
      source: 'My breakthrough moments always involve taking embodied action despite mental resistance',
      experiencer: 'Human',
      experience: ['mental embodiment', 'directed purpose', 'anticipatory time'],
      reflects: ['exp_004', 'exp_006'],
      created: '2024-01-18T10:15:00Z'
    }
  ];
}

// ============================================================================
// ANALYSIS FUNCTIONS
// ============================================================================

function analyzeSingleDimension(experiences: Experience[], dimension: string): any {
  const dim = SEMANTIC_DIMENSIONS[dimension as keyof typeof SEMANTIC_DIMENSIONS];
  if (!dim) return null;
  
  // Convert experiences to coordinates if needed
  const experiencesWithCoords = experiences.map(exp => ({
    ...exp,
    coordinates: exp.coordinates || convertNaturalLanguageToCoordinates(exp.experience)
  }));
  
  // Filter experiences that have this dimension
  const relevantExperiences = experiencesWithCoords.filter(exp => 
    exp.coordinates![dimension] !== undefined
  );
  
  if (relevantExperiences.length === 0) {
    return { dimension, count: 0, message: 'No experiences with this dimension' };
  }
  
  // Group by coordinate ranges
  const groups: Record<string, any[]> = {
    'low': [],      // 0.0-0.3
    'mid-low': [],  // 0.4-0.6  
    'mid-high': [], // 0.7-0.8
    'high': []      // 0.9-1.0
  };
  
  for (const exp of relevantExperiences) {
    const value = exp.coordinates![dimension];
    if (value <= 0.3) groups.low.push(exp);
    else if (value <= 0.6) groups['mid-low'].push(exp);
    else if (value <= 0.8) groups['mid-high'].push(exp);
    else groups.high.push(exp);
  }
  
  return {
    dimension,
    name: dim.name,
    description: dim.description,
    totalExperiences: relevantExperiences.length,
    groups,
    averageValue: relevantExperiences.reduce((sum, exp) => sum + exp.coordinates![dimension], 0) / relevantExperiences.length
  };
}

function analyzeTwoDimensions(experiences: Experience[], dim1: string, dim2: string): any {
  const analysis1 = analyzeSingleDimension(experiences, dim1);
  const analysis2 = analyzeSingleDimension(experiences, dim2);
  
  if (!analysis1 || !analysis2) return null;
  
  // Convert experiences to coordinates
  const experiencesWithCoords = experiences.map(exp => ({
    ...exp,
    coordinates: exp.coordinates || convertNaturalLanguageToCoordinates(exp.experience)
  }));
  
  // Filter experiences that have both dimensions
  const relevantExperiences = experiencesWithCoords.filter(exp => 
    exp.coordinates![dim1] !== undefined && exp.coordinates![dim2] !== undefined
  );
  
  // Create 2D grid analysis
  const grid: Record<string, Record<string, any[]>> = {
    'low': { 'low': [], 'mid': [], 'high': [] },
    'mid': { 'low': [], 'mid': [], 'high': [] },
    'high': { 'low': [], 'mid': [], 'high': [] }
  };
  
  for (const exp of relevantExperiences) {
    const val1 = exp.coordinates![dim1];
    const val2 = exp.coordinates![dim2];
    
    const range1 = val1 <= 0.3 ? 'low' : val1 <= 0.7 ? 'mid' : 'high';
    const range2 = val2 <= 0.3 ? 'low' : val2 <= 0.7 ? 'mid' : 'high';
    
    grid[range1][range2].push(exp);
  }
  
  return {
    dimensions: [dim1, dim2],
    names: [analysis1.name, analysis2.name],
    totalExperiences: relevantExperiences.length,
    grid,
    correlation: calculateCorrelation(relevantExperiences, dim1, dim2)
  };
}

function calculateCorrelation(experiences: Experience[], dim1: string, dim2: string): number {
  const values = experiences.map(exp => ({
    x: exp.coordinates![dim1],
    y: exp.coordinates![dim2]
  }));
  
  const n = values.length;
  if (n < 2) return 0;
  
  const sumX = values.reduce((sum, v) => sum + v.x, 0);
  const sumY = values.reduce((sum, v) => sum + v.y, 0);
  const sumXY = values.reduce((sum, v) => sum + v.x * v.y, 0);
  const sumX2 = values.reduce((sum, v) => sum + v.x * v.x, 0);
  const sumY2 = values.reduce((sum, v) => sum + v.y * v.y, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

// ============================================================================
// MAIN PROTOTYPE
// ============================================================================

async function runPrototype() {
  console.log('🧪 Bridge Semantic Coordinate System Prototype\n');
  
  // Generate synthetic data
  const experiences = generateSyntheticExperiences();
  console.log(`📊 Generated ${experiences.length} synthetic experiences\n`);
  
  // Convert to coordinates
  const experiencesWithCoords = experiences.map(exp => ({
    ...exp,
    coordinates: convertNaturalLanguageToCoordinates(exp.experience)
  }));
  
  console.log('🔍 Experience Analysis:\n');
  for (const exp of experiencesWithCoords) {
    console.log(`ID: ${exp.id}`);
    console.log(`Source: "${exp.source}"`);
    console.log(`Natural Language: [${exp.experience.join(', ')}]`);
    console.log(`Coordinates: ${JSON.stringify(exp.coordinates)}`);
    if (exp.reflects) {
      console.log(`Reflects on: ${exp.reflects.join(', ')}`);
    }
    console.log('');
  }
  
  // Single dimension analysis
  console.log('📈 Single Dimension Analysis:\n');
  const purposeAnalysis = analyzeSingleDimension(experiencesWithCoords, 'purpose');
  console.log('Purpose Analysis:');
  console.log(JSON.stringify(purposeAnalysis, null, 2));
  console.log('');
  
  const embodiedAnalysis = analyzeSingleDimension(experiencesWithCoords, 'embodied');
  console.log('Embodied Analysis:');
  console.log(JSON.stringify(embodiedAnalysis, null, 2));
  console.log('');
  
  // Two dimension analysis
  console.log('📊 Two Dimension Analysis:\n');
  const focusTimeAnalysis = analyzeTwoDimensions(experiencesWithCoords, 'focus', 'time');
  console.log('Focus vs Time Analysis:');
  console.log(JSON.stringify(focusTimeAnalysis, null, 2));
  console.log('');
  
  // OODA Loop analysis
  console.log('🔄 OODA Loop Analysis:\n');
  const oodaAnalysis = analyzeTwoDimensions(experiencesWithCoords, 'focus', 'time');
  if (oodaAnalysis) {
    console.log('OODA Loop Quadrants:');
    console.log(`Observe (precise + historical): ${oodaAnalysis.grid.low.low.length} experiences`);
    console.log(`Orient (wide + historical): ${oodaAnalysis.grid.high.low.length} experiences`);
    console.log(`Decide (wide + anticipatory): ${oodaAnalysis.grid.high.high.length} experiences`);
    console.log(`Act (precise + anticipatory): ${oodaAnalysis.grid.low.high.length} experiences`);
  }
}

// Run the prototype
runPrototype().catch(console.error); 