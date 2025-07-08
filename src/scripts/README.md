# LLM Integration Testing

This directory contains scripts for testing the Bridge MCP server with real LLMs (like Claude) to validate tool design, UX, and real-world usability.

## Quick Start

1. **Set up your environment:**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env and add your Anthropic API key
   # Get your key from: https://console.anthropic.com/settings/keys
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Run the LLM integration test:**
   ```bash
   npm run test:llm
   ```

## What the Test Does

The LLM integration test:

1. **Connects to your Bridge MCP server** via stdio transport
2. **Fetches all tool definitions** (capture, search, release, status)
3. **Sends a "think aloud" script to Claude** asking it to:
   - Analyze the tool design and purpose
   - Create a testing plan
   - Execute tools and observe results
   - Provide honest feedback about the experience
4. **Records all interactions** including:
   - Tool calls and their results
   - LLM responses and reasoning
   - Success/failure of each operation
5. **Generates a final assessment** with recommendations
6. **Saves detailed results** to `test-results/` directory

## Test Output

The test provides real-time feedback with emojis and clear status messages:

- 🔌 Connecting to server
- 📋 Fetching tool definitions  
- 🧠 Starting LLM test
- 💬 Claude's responses
- 🔧 Tool executions
- ✅ Success indicators
- ❌ Error indicators
- 📊 Final assessment
- 💾 Results saved

## Results

Test results are saved to `test-results/llm-integration-test-{timestamp}.json` with:

- **Timestamp** of the test run
- **Tool calls** with arguments, results, and success status
- **LLM responses** - all of Claude's thinking and feedback
- **Final assessment** - comprehensive evaluation and recommendations

## Customization

You can modify the test script in `src/scripts/llm-integration-test.ts`:

- **Change the prompt** to focus on specific aspects
- **Add more tools** to test additional functionality
- **Modify the conversation flow** to test different scenarios
- **Adjust token limits** for longer/shorter responses

## Troubleshooting

**"ANTHROPIC_API_KEY is not set"**
- Make sure you've created a `.env` file with your API key
- Verify the key is valid and has sufficient credits

**"Failed to connect to MCP server"**
- Ensure you've run `npm run build` first
- Check that `dist/index.js` exists
- Verify your MCP server starts correctly with `npm start`

**"Tool execution failed"**
- Check the server logs for detailed error messages
- Verify your data storage is working correctly
- Ensure all required dependencies are installed

## Example Test Session

A typical test session might look like:

```
🔌 Connecting to Bridge MCP server...
✅ Connected to MCP server successfully
📋 Fetching tool definitions...
✅ Found 4 tools
🧠 Starting LLM integration test...
📝 Sending test script to Claude...

💬 Claude says:
Looking at this Bridge MCP tool, I can see it's designed for capturing and managing experiential data...

🔧 Claude wants to use tool: capture
📋 Arguments: { "content": "I felt anxious during the meeting...", "experiencer": "test-user" }
✅ Tool executed successfully
📤 Result: { "source": { "id": "src_abc123", ... } }

💬 Claude says:
Great! The capture tool worked as expected. Now let me test the search functionality...

🔧 Claude wants to use tool: search
📋 Arguments: { "semantic_query": "moments of anxiety" }
✅ Tool executed successfully
📤 Result: { "results": [...], "total": 1 }

📊 Generating final assessment...
📋 Final Assessment:
Overall, the Bridge tool provides an intuitive way to capture experiential data...

💾 Test results saved to: test-results/llm-integration-test-2024-01-15T10-30-45-123Z.json
🎉 LLM integration test completed successfully! 