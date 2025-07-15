/**
 * Synthetic Test Fixtures for Bridge Testing
 * 
 * Creates realistic but fictional experiential data for testing scenarios:
 * - Diverse experiences across multiple experiencers
 * - Multiple timeframes for temporal testing
 * - Various phenomenological qualities
 * - Relationship and social experiences
 * - Creative and work experiences
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

interface TestExperience {
  content: string;
  experiencer: string;
  perspective: 'I' | 'we' | 'you' | 'they';
  processing: 'during' | 'right-after' | 'long-after' | 'crafted';
  created: string;
  experience: {
    emoji: string;
    narrative: string;
    qualities: Array<{
      type: 'embodied' | 'attentional' | 'affective' | 'purposive' | 'spatial' | 'temporal' | 'intersubjective';
      prominence: number;
      manifestation: string;
    }>;
  };
}



const WORK_STRESS_EXPERIENCES: TestExperience[] = [
  {
    content: "The deadline is tomorrow and I still have three major bugs to fix. My shoulders are tense and I can feel my heart racing every time I think about the presentation.",
    experiencer: "Alex Chen",
    perspective: "I",
    processing: "during",
    created: "2024-12-10T14:30:00Z",
    experience: {
      emoji: "😰",
      narrative: "Racing heart, tense shoulders, deadline panic setting in",
      qualities: [
        { type: "embodied", prominence: 0.8, manifestation: "tight shoulders, racing heart" },
        { type: "temporal", prominence: 0.9, manifestation: "acute deadline pressure" },
        { type: "affective", prominence: 0.7, manifestation: "anxiety and overwhelm" }
      ]
    }
  },
  {
    content: "Another meeting that could have been an email. I'm sitting here watching people repeat the same points while my actual work piles up. The fluorescent lights are giving me a headache.",
    experiencer: "Alex Chen", 
    perspective: "I",
    processing: "during",
    created: "2024-12-12T10:15:00Z",
    experience: {
      emoji: "🙄",
      narrative: "Trapped in pointless meeting, work piling up, head throbbing",
      qualities: [
        { type: "temporal", prominence: 0.6, manifestation: "time feeling wasted" },
        { type: "embodied", prominence: 0.5, manifestation: "headache from lights" },
        { type: "purposive", prominence: 0.8, manifestation: "frustration with inefficiency" }
      ]
    }
  },
  {
    content: "Finally submitted the project! The relief is incredible. I can feel my whole body relaxing for the first time in weeks. Team celebration at the coffee shop felt so good.",
    experiencer: "Alex Chen",
    perspective: "I", 
    processing: "right-after",
    created: "2024-12-13T17:45:00Z",
    experience: {
      emoji: "🎉",
      narrative: "Relief flooding through relaxing body, celebrating with team",
      qualities: [
        { type: "embodied", prominence: 0.7, manifestation: "whole body relaxing" },
        { type: "affective", prominence: 0.9, manifestation: "relief and joy" },
        { type: "intersubjective", prominence: 0.6, manifestation: "team connection and celebration" }
      ]
    }
  }
];

const RELATIONSHIP_EXPERIENCES: TestExperience[] = [
  {
    content: "Had lunch with Sarah today. She really listened when I talked about my career doubts. There's something special about being truly heard by a friend.",
    experiencer: "Jordan Kim",
    perspective: "I",
    processing: "right-after", 
    created: "2024-12-08T13:30:00Z",
    experience: {
      emoji: "🤗",
      narrative: "Feeling deeply heard and supported by close friend",
      qualities: [
        { type: "intersubjective", prominence: 0.9, manifestation: "deep sense of being understood" },
        { type: "affective", prominence: 0.7, manifestation: "warmth and gratitude" },
        { type: "spatial", prominence: 0.4, manifestation: "intimate lunch setting" }
      ]
    }
  },
  {
    content: "Mom called again asking when I'm getting married. I love her but the pressure makes me want to avoid family calls. Why can't she just accept where I am in life?",
    experiencer: "Jordan Kim",
    perspective: "I",
    processing: "long-after",
    created: "2024-12-05T19:20:00Z", 
    experience: {
      emoji: "😤",
      narrative: "Love mixed with frustration, feeling pressured and misunderstood",
      qualities: [
        { type: "intersubjective", prominence: 0.8, manifestation: "conflicted family dynamics" },
        { type: "affective", prominence: 0.7, manifestation: "frustration mixed with love" },
        { type: "purposive", prominence: 0.6, manifestation: "desire for acceptance" }
      ]
    }
  },
  {
    content: "The way Marcus looked at me during the presentation - like he was really seeing my ideas, not just waiting for his turn to speak. That kind of professional respect feels rare.",
    experiencer: "Jordan Kim",
    perspective: "I",
    processing: "right-after",
    created: "2024-12-11T15:45:00Z",
    experience: {
      emoji: "✨",
      narrative: "Being truly seen and respected in professional space",
      qualities: [
        { type: "intersubjective", prominence: 0.8, manifestation: "feeling professionally valued" },
        { type: "attentional", prominence: 0.6, manifestation: "being genuinely listened to" },
        { type: "affective", prominence: 0.5, manifestation: "professional validation" }
      ]
    }
  }
];

const CREATIVE_EXPERIENCES: TestExperience[] = [
  {
    content: "I was stuck on this painting for weeks, then this morning while making coffee, I suddenly knew exactly what color the sky needed to be. Ran to my easel still in pajamas.",
    experiencer: "River Martinez",
    perspective: "I", 
    processing: "right-after",
    created: "2024-12-07T07:15:00Z",
    experience: {
      emoji: "💡", 
      narrative: "Sudden creative clarity strikes during morning routine",
      qualities: [
        { type: "attentional", prominence: 0.9, manifestation: "sudden clear vision" },
        { type: "embodied", prominence: 0.6, manifestation: "urgent physical response" },
        { type: "temporal", prominence: 0.5, manifestation: "perfect timing breakthrough" }
      ]
    }
  },
  {
    content: "Three hours went by like minutes while I was writing. I looked up and it was dark outside. The story was just flowing through me, like I was discovering it rather than creating it.",
    experiencer: "River Martinez",
    perspective: "I",
    processing: "right-after", 
    created: "2024-12-09T22:30:00Z",
    experience: {
      emoji: "🌊",
      narrative: "Lost in creative flow, time dissolving, story discovering itself",
      qualities: [
        { type: "temporal", prominence: 0.9, manifestation: "time distortion in flow state" },
        { type: "attentional", prominence: 0.8, manifestation: "complete absorption" },
        { type: "purposive", prominence: 0.7, manifestation: "sense of discovery vs creation" }
      ]
    }
  }
];

const DAILY_LIFE_EXPERIENCES: TestExperience[] = [
  {
    content: "Walking to work this morning, I noticed how the autumn light filters through the oak tree by the library. Made me think about how many people have walked this same path over the years.",
    experiencer: "Sam Patel",
    perspective: "I",
    processing: "during",
    created: "2024-12-06T08:20:00Z",
    experience: {
      emoji: "🍂",
      narrative: "Morning light through oak triggers reflection on shared human paths",
      qualities: [
        { type: "spatial", prominence: 0.7, manifestation: "awareness of place and path" },
        { type: "temporal", prominence: 0.8, manifestation: "connection across time" },
        { type: "attentional", prominence: 0.6, manifestation: "mindful observation" }
      ]
    }
  },
  {
    content: "The grocery store was chaos tonight - long lines, screaming kids, everyone seemed stressed. But the cashier smiled and asked about my day. Small kindness in the middle of madness.",
    experiencer: "Sam Patel",
    perspective: "I",
    processing: "right-after",
    created: "2024-12-10T18:45:00Z",
    experience: {
      emoji: "😊",
      narrative: "Kindness cuts through chaos, human connection in mundane moment",
      qualities: [
        { type: "intersubjective", prominence: 0.7, manifestation: "unexpected human warmth" },
        { type: "spatial", prominence: 0.5, manifestation: "chaotic public environment" },
        { type: "affective", prominence: 0.6, manifestation: "stress transformed by kindness" }
      ]
    }
  }
];

const LEARNING_EXPERIENCES: TestExperience[] = [
  {
    content: "Finally understood recursion today! It clicked when the professor drew it on the board - each function calling itself, building up then unwinding. My mind feels expanded.",
    experiencer: "Maya Singh",
    perspective: "I",
    processing: "during",
    created: "2024-12-04T14:20:00Z", 
    experience: {
      emoji: "🤯",
      narrative: "Mind expanding as complex concept suddenly clicks into place",
      qualities: [
        { type: "attentional", prominence: 0.9, manifestation: "sudden clear understanding" },
        { type: "embodied", prominence: 0.5, manifestation: "feeling of mental expansion" },
        { type: "spatial", prominence: 0.6, manifestation: "visual representation helping comprehension" }
      ]
    }
  },
  {
    content: "Struggling with this math proof for hours. I know I'm missing something obvious but I can't see it. The frustration is building and I want to throw my notebook across the room.",
    experiencer: "Maya Singh",
    perspective: "I", 
    processing: "during",
    created: "2024-12-11T21:30:00Z",
    experience: {
      emoji: "😠",
      narrative: "Mounting frustration, knowledge just out of reach, physical urge to quit",
      qualities: [
        { type: "affective", prominence: 0.8, manifestation: "building frustration and anger" },
        { type: "embodied", prominence: 0.6, manifestation: "physical urge to throw things" },
        { type: "attentional", prominence: 0.7, manifestation: "feeling blocked, missing obvious solution" }
      ]
    }
  }
];

// Create fixture data that spans 6 months for temporal testing
export function createTestFixtures(): any {
  const allExperiences = [
    ...WORK_STRESS_EXPERIENCES,
    ...RELATIONSHIP_EXPERIENCES, 
    ...CREATIVE_EXPERIENCES,
    ...DAILY_LIFE_EXPERIENCES,
    ...LEARNING_EXPERIENCES
  ];

  // Add more varied experiences across different timeframes
  const extendedExperiences = [];
  
  // Generate experiences over 6 months
  for (let month = 0; month < 6; month++) {
    for (let week = 0; week < 4; week++) {
      const baseDate = new Date('2024-07-01');
      baseDate.setMonth(baseDate.getMonth() + month);
      baseDate.setDate(baseDate.getDate() + (week * 7));
      
      // Add evolving stress experiences for Alex
      if (month < 3) {
        extendedExperiences.push({
          content: `Another stressful day at work. The pressure never seems to ease up. I'm noticing how my shoulders always tense up.`,
          experiencer: "Alex Chen",
          perspective: "I",
          processing: "right-after", 
          created: baseDate.toISOString(),
          experience: {
            emoji: "😫",
            narrative: "Familiar stress response, body holding tension in shoulders",
            qualities: [
              { type: "embodied", prominence: 0.7, manifestation: "chronic shoulder tension" },
              { type: "temporal", prominence: 0.6, manifestation: "recognizing recurring experience" },
              { type: "affective", prominence: 0.8, manifestation: "ongoing stress and fatigue" }
            ]
          }
        });
      } else {
        // Show evolution - Alex learning to manage stress better
        extendedExperiences.push({
          content: `Work was busy today but I remembered to do the breathing exercise. The stress didn't build up in my shoulders as much. Small progress feels significant.`,
          experiencer: "Alex Chen", 
          perspective: "I",
          processing: "right-after",
          created: baseDate.toISOString(),
          experience: {
            emoji: "🌱",
            narrative: "Practicing new coping strategies, noticing positive changes",
            qualities: [
              { type: "embodied", prominence: 0.4, manifestation: "less shoulder tension than usual" },
              { type: "purposive", prominence: 0.8, manifestation: "intentional stress management" },
              { type: "temporal", prominence: 0.6, manifestation: "recognizing gradual improvement" }
            ]
          }
        });
      }
    }
  }

  return {
    sources: [...allExperiences, ...extendedExperiences].map((exp, index) => ({
      id: `test_${Date.now()}_${index.toString().padStart(3, '0')}`,
      type: "source",
      content: exp.content,
      created: exp.created,
      perspective: exp.perspective,
      processing: exp.processing,
      experiencer: exp.experiencer,
      crafted: exp.processing === 'crafted',
      experience: exp.experience
    }))
  };
}

export function saveTestFixtures(filepath: string): void {
  const fixtures = createTestFixtures();
  writeFileSync(filepath, JSON.stringify(fixtures, null, 2));
  console.log(`✅ Created test fixtures with ${fixtures.sources.length} experiences`);
  console.log(`📁 Saved to: ${filepath}`);
}

// CLI usage
import { fileURLToPath } from 'url';
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const fixturesPath = join(process.cwd(), 'test-fixtures.json');
  saveTestFixtures(fixturesPath);
}