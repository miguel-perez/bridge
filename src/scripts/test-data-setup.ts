import { join } from 'path';
import { CaptureService } from '../services/capture.js';
import { clearTestStorage, setStorageConfig } from '../core/storage.js';

interface TestScenario {
  name: string;
  description: string;
  data: Array<{
    content: string;
    experiencer: string;
    perspective: string;
    processing: string;
    occurred?: string; // When it happened (chrono-node compatible)
    crafted: boolean;
    experiential_qualities?: {
      qualities: Array<{
        type: "attentional" | "affective" | "purposive" | "embodied" | "temporal" | "intersubjective" | "spatial";
        prominence: number;
        manifestation: string;
      }>;
    };
  }>;
}

const testScenarios: TestScenario[] = [
  {
    name: "Creative Breakthroughs",
    description: "Various creative insights and breakthrough moments",
    data: [
      {
        content: "I just had this amazing insight while working on a design system. I realized that the same constraints that made pixel art so powerful - using limited tiles to create infinite scenes - could apply to our component library.",
        experiencer: "self",
        perspective: "I",
        processing: "right-after",
        occurred: "just now",
        crafted: false,
        experiential_qualities: {
          qualities: [
            {
              type: "attentional",
              prominence: 0.8,
              manifestation: "sudden breakthrough realization"
            },
            {
              type: "affective",
              prominence: 0.7,
              manifestation: "excitement and discovery"
            },
            {
              type: "purposive",
              prominence: 0.9,
              manifestation: "strong sense of practical application and direction"
            }
          ]
        }
      },
      {
        content: "While debugging this complex algorithm, I suddenly saw the pattern. It wasn't a bug - it was a feature! The edge cases were actually the core logic working correctly.",
        experiencer: "self",
        perspective: "I",
        processing: "during",
        occurred: "yesterday afternoon",
        crafted: false,
        experiential_qualities: {
          qualities: [
            {
              type: "attentional",
              prominence: 0.9,
              manifestation: "intense focus and pattern recognition"
            },
            {
              type: "affective",
              prominence: 0.6,
              manifestation: "relief and satisfaction"
            },
            {
              type: "purposive",
              prominence: 0.8,
              manifestation: "clear direction and understanding"
            }
          ]
        }
      }
    ]
  },
  {
    name: "Work Challenges",
    description: "Experiences of feeling stuck, stressed, or challenged at work",
    data: [
      {
        content: "I've been stuck on this feature for three days now. Every time I think I'm close, I hit another roadblock. The requirements keep changing and I'm starting to feel overwhelmed.",
        experiencer: "self",
        perspective: "I",
        processing: "during",
        occurred: "3 days ago",
        crafted: false,
        experiential_qualities: {
          qualities: [
            {
              type: "embodied",
              prominence: 0.7,
              manifestation: "physical tension and fatigue"
            },
            {
              type: "attentional",
              prominence: 0.3,
              manifestation: "scattered focus and difficulty concentrating"
            },
            {
              type: "affective",
              prominence: 0.8,
              manifestation: "frustration and anxiety"
            },
            {
              type: "temporal",
              prominence: 0.6,
              manifestation: "sense of time pressure and urgency"
            }
          ]
        }
      },
      {
        content: "The client meeting was a disaster. They kept interrupting me, asking for changes that contradict what they said last week. I felt my confidence crumbling as the presentation fell apart.",
        experiencer: "self",
        perspective: "I",
        processing: "right-after",
        occurred: "last week",
        crafted: false,
        experiential_qualities: {
          qualities: [
            {
              type: "embodied",
              prominence: 0.8,
              manifestation: "physical anxiety and tension"
            },
            {
              type: "affective",
              prominence: 0.9,
              manifestation: "intense frustration and self-doubt"
            },
            {
              type: "intersubjective",
              prominence: 0.8,
              manifestation: "feeling judged and misunderstood"
            }
          ]
        }
      },
      {
        content: "I'm completely overwhelmed with this project. The deadline is impossible, the scope keeps growing, and I don't have the resources I need. I feel like I'm drowning in work.",
        experiencer: "self",
        perspective: "I",
        processing: "during",
        occurred: "yesterday",
        crafted: false,
        experiential_qualities: {
          qualities: [
            {
              type: "embodied",
              prominence: 0.9,
              manifestation: "physical exhaustion and stress"
            },
            {
              type: "attentional",
              prominence: 0.2,
              manifestation: "inability to focus or prioritize"
            },
            {
              type: "affective",
              prominence: 0.9,
              manifestation: "overwhelming stress and anxiety"
            },
            {
              type: "temporal",
              prominence: 0.8,
              manifestation: "acute time pressure and urgency"
            }
          ]
        }
      }
    ]
  },
  {
    name: "Learning Moments",
    description: "Educational insights and learning experiences",
    data: [
      {
        content: "Finally understood how React hooks work under the hood. It's not magic - it's just a clever way of managing state in a functional paradigm. The 'aha' moment came when I realized it's all about closure scope.",
        experiencer: "self",
        perspective: "I",
        processing: "right-after",
        occurred: "yesterday",
        crafted: false,
        experiential_qualities: {
          qualities: [
            {
              type: "attentional",
              prominence: 0.8,
              manifestation: "clarity of understanding"
            },
            {
              type: "affective",
              prominence: 0.6,
              manifestation: "satisfaction and accomplishment"
            },
            {
              type: "purposive",
              prominence: 0.7,
              manifestation: "sense of progress and capability"
            }
          ]
        }
      },
      {
        content: "The workshop on user research methods was eye-opening. I never realized how much bias can creep into interviews. The exercise where we practiced active listening really showed me how often I was leading the participant instead of following.",
        experiencer: "self",
        perspective: "I",
        processing: "long-after",
        occurred: "2 weeks ago",
        crafted: true,
        experiential_qualities: {
          qualities: [
            {
              type: "attentional",
              prominence: 0.7,
              manifestation: "heightened awareness of communication patterns"
            },
            {
              type: "intersubjective",
              prominence: 0.7,
              manifestation: "improved understanding of others' perspectives"
            },
            {
              type: "purposive",
              prominence: 0.6,
              manifestation: "commitment to better research practices"
            }
          ]
        }
      }
    ]
  },
  {
    name: "Social Interactions",
    description: "Team dynamics, collaboration, and social experiences",
    data: [
      {
        content: "The code review session with Sarah was amazing. She didn't just point out issues - she explained the reasoning behind each suggestion. I learned more in that hour than I have in weeks of solo coding.",
        experiencer: "self",
        perspective: "I",
        processing: "right-after",
        occurred: "yesterday",
        crafted: false,
        experiential_qualities: {
          qualities: [
            {
              type: "attentional",
              prominence: 0.8,
              manifestation: "focused learning and absorption"
            },
            {
              type: "affective",
              prominence: 0.7,
              manifestation: "appreciation and gratitude"
            },
            {
              type: "intersubjective",
              prominence: 0.9,
              manifestation: "strong sense of collaboration and mentorship"
            }
          ]
        }
      },
      {
        content: "The team retrospective was tense. Everyone was defensive about their work, and constructive feedback turned into personal attacks. I felt like I was walking on eggshells trying to keep the peace.",
        experiencer: "self",
        perspective: "I",
        processing: "during",
        occurred: "last Friday",
        crafted: false,
        experiential_qualities: {
          qualities: [
            {
              type: "embodied",
              prominence: 0.6,
              manifestation: "physical tension and discomfort"
            },
            {
              type: "affective",
              prominence: 0.8,
              manifestation: "anxiety and stress about team dynamics"
            },
            {
              type: "intersubjective",
              prominence: 0.9,
              manifestation: "conflict and strained relationships"
            }
          ]
        }
      }
    ]
  },
  {
    name: "Duplicate Records",
    description: "Records that are similar or duplicates for testing cleanup scenarios",
    data: [
      {
        content: "I just had this amazing insight while working on a design system. I realized that the same constraints that made pixel art so powerful - using limited tiles to create infinite scenes - could apply to our component library.",
        experiencer: "self",
        perspective: "I",
        processing: "right-after",
        occurred: "just now",
        crafted: false,
        experiential_qualities: {
          qualities: [
            {
              type: "attentional",
              prominence: 0.8,
              manifestation: "sudden breakthrough realization"
            },
            {
              type: "affective",
              prominence: 0.7,
              manifestation: "excitement and discovery"
            },
            {
              type: "purposive",
              prominence: 0.9,
              manifestation: "strong sense of practical application and direction"
            }
          ]
        }
      },
      {
        content: "I just had this amazing insight while working on a design system. I realized that the same constraints that made pixel art so powerful - using limited tiles to create infinite scenes - could apply to our component library.",
        experiencer: "self",
        perspective: "I",
        processing: "right-after",
        occurred: "just now",
        crafted: false,
        experiential_qualities: {
          qualities: [
            {
              type: "attentional",
              prominence: 0.8,
              manifestation: "sudden breakthrough realization"
            },
            {
              type: "affective",
              prominence: 0.7,
              manifestation: "excitement and discovery"
            },
            {
              type: "purposive",
              prominence: 0.9,
              manifestation: "strong sense of practical application and direction"
            }
          ]
        }
      }
    ]
  },
  {
    name: "Edge Cases",
    description: "Records with unusual content for testing edge cases",
    data: [
      {
        content: "😀😃😄😁😆😅😂🤣 This is a test record with emoji content to test malformed query handling.",
        experiencer: "self",
        perspective: "I",
        processing: "right-after",
        occurred: "now",
        crafted: true,
        experiential_qualities: {
          qualities: [
            {
              type: "attentional",
              prominence: 0.3,
              manifestation: "testing focus"
            }
          ]
        }
      },
      {
        content: "This is a very long record that contains a lot of repetitive text to test how the system handles oversized content. ".repeat(50),
        experiencer: "self",
        perspective: "I",
        processing: "right-after",
        occurred: "now",
        crafted: true,
        experiential_qualities: {
          qualities: [
            {
              type: "attentional",
              prominence: 0.2,
              manifestation: "testing large content"
            }
          ]
        }
      }
    ]
  }
];

export class TestDataSetup {
  private captureService: CaptureService;

  constructor() {
    this.captureService = new CaptureService();
  }

  async setupTestData(): Promise<void> {
    console.log('🧪 Setting up test data...');
    
    // Clear existing test data
    console.log('🧹 Clearing existing test data...');
    const testDataPath = join(process.cwd(), 'data', 'bridge-test.json');
    setStorageConfig({ dataFile: testDataPath });
    await clearTestStorage();
    
    let totalRecords = 0;
    
    // Create test data for each scenario
    for (const scenario of testScenarios) {
      console.log(`📝 Creating ${scenario.name} records...`);
      
      for (const record of scenario.data) {
        try {
          const result = await this.captureService.captureSource({
            content: record.content,
            experiencer: record.experiencer,
            perspective: record.perspective as any,
            processing: record.processing as any,
            occurred: record.occurred,
            crafted: record.crafted,
            experiential_qualities: record.experiential_qualities
          });
          
          console.log(`  ✅ Created record: ${result.source.id}`);
          totalRecords++;
          
        } catch (error) {
          console.error(`  ❌ Failed to create record: ${error}`);
        }
      }
    }
    
    console.log(`\n🎉 Test data setup complete! Created ${totalRecords} records.`);
    console.log('\n📊 Test Data Summary:');
    
    for (const scenario of testScenarios) {
      console.log(`  • ${scenario.name}: ${scenario.data.length} records`);
      console.log(`    ${scenario.description}`);
    }
    
    console.log('\n🔍 Available Test Scenarios:');
    console.log('  1. Search for "feeling stuck" experiences (Work Challenges)');
    console.log('  2. Search for "creative breakthroughs" (Creative Breakthroughs)');
    console.log('  3. Search for "learning moments" (Learning Moments)');
    console.log('  4. Search for "team interactions" (Social Interactions)');
    console.log('  5. Test duplicate cleanup (Duplicate Records)');
    console.log('  6. Test semantic search across all categories');
    console.log('  7. Test temporal filtering (various time ranges)');
    console.log('  8. Test experiential quality filtering');
  }

  async verifyTestData(): Promise<void> {
    console.log('\n🔍 Verifying test data...');
    
    // Import search service to verify data
    const { SearchService } = await import('../services/search.js');
    const searchService = new SearchService();
    
    const allResults = await searchService.search({});
    console.log(`  📊 Total records in system: ${allResults.results.length}`);
    
    // Test a few specific searches
    const stuckResults = await searchService.search({
      semantic_query: "feeling stuck or overwhelmed"
    });
    console.log(`  🔍 "Feeling stuck" results: ${stuckResults.results.length}`);
    
    const creativeResults = await searchService.search({
      semantic_query: "creative breakthrough insight"
    });
    console.log(`  🎨 "Creative breakthrough" results: ${creativeResults.results.length}`);
    
    const learningResults = await searchService.search({
      semantic_query: "learning understanding workshop"
    });
    console.log(`  📚 "Learning" results: ${learningResults.results.length}`);
    
    console.log('✅ Test data verification complete!');
  }
}

async function main() {
  const setup = new TestDataSetup();
  
  try {
    await setup.setupTestData();
    await setup.verifyTestData();
    
    console.log('\n🎯 Test data is ready for integration testing!');
    console.log('💡 You can now run the LLM integration test with realistic scenarios.');
    
  } catch (error) {
    console.error('💥 Test data setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
main(); 