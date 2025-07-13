import { Client as MCPClient } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { join } from 'path';

async function testNarrativeStyle(): Promise<void> {
  const mcp = new MCPClient({ 
    name: "narrative-style-test", 
    version: "1.0.0" 
  });
  
  try {
    console.log('🔌 Connecting to Bridge MCP server...');
    
    const serverPath = join(process.cwd(), 'dist', 'index.js');
    const transport = new StdioClientTransport({ 
      command: "node", 
      args: [serverPath],
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    await mcp.connect(transport);
    console.log('✅ Connected to MCP server successfully');
    
    // Test examples with the new narrative style
    const examples = [
      {
        content: "I'm walking through the rain and feeling completely alive. The water is cold but invigorating.",
        narrative: "Step through cold rain, body tingles with life",
        experiencer: "Test User",
        perspective: "I",
        processing: "during",
        experience: {
          qualities: [
            {
              type: "embodied",
              prominence: 0.9,
              manifestation: "cold water invigorating the body"
            },
            {
              type: "affective",
              prominence: 0.8,
              manifestation: "feeling completely alive"
            }
          ],
          emoji: "🌧️"
        }
      },
      {
        content: "Just finished a difficult conversation with my boss. My heart is still racing and I can't stop fidgeting.",
        narrative: "Heart pounds, fingers twitch after tough talk",
        experiencer: "Test User",
        perspective: "I",
        processing: "right-after",
        experience: {
          qualities: [
            {
              type: "affective",
              prominence: 0.9,
              manifestation: "anxiety and nervous energy"
            },
            {
              type: "embodied",
              prominence: 0.7,
              manifestation: "racing heart and fidgeting"
            }
          ],
          emoji: "💓"
        }
      },
      {
        content: "Cooking dinner with my partner while music plays in the background. We're laughing and the kitchen smells amazing.",
        narrative: "Stir sauce, laughter spills from kitchen",
        experiencer: "Test User",
        perspective: "I",
        processing: "during",
        experience: {
          qualities: [
            {
              type: "intersubjective",
              prominence: 0.9,
              manifestation: "shared laughter and connection"
            },
            {
              type: "embodied",
              prominence: 0.6,
              manifestation: "aromatic kitchen atmosphere"
            }
          ],
          emoji: "🍳"
        }
      }
    ];
    
    console.log('\n🧪 Testing new narrative style with examples:\n');
    
    for (let i = 0; i < examples.length; i++) {
      const example = examples[i];
      console.log(`Example ${i + 1}:`);
      console.log(`Content: "${example.content}"`);
      console.log(`Narrative: "${example.narrative}"`);
      console.log(`Length: ${example.narrative.length} characters`);
      console.log('');
      
      try {
        const result = await mcp.callTool({
          name: 'capture',
          arguments: example
        });
        
        console.log('✅ Capture successful!');
        if (result.content && Array.isArray(result.content) && result.content.length > 0) {
          const content = result.content[0];
          if (typeof content === 'object' && 'text' in content) {
            console.log(content.text);
          } else {
            console.log('Result:', JSON.stringify(result, null, 2));
          }
        } else {
          console.log('Result:', JSON.stringify(result, null, 2));
        }
        console.log('\n' + '='.repeat(60) + '\n');
        
      } catch (error) {
        console.error('❌ Capture failed:', error);
        console.log('\n' + '='.repeat(60) + '\n');
      }
    }
    
    console.log('🎉 Narrative style test completed!');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await mcp.close();
  }
}

testNarrativeStyle(); 