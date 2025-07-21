---
description: MCP Development Patterns for Bridge
---

# MCP Development Patterns

## Tool Implementation Pattern

### 1. Schema Definition
```typescript
// In src/mcp/schemas.ts
export const ExperienceInputSchema = z.object({
  source: z.string().min(1),
  experience: z.array(z.string()).optional(),
  reflects: z.array(z.string()).optional()
});

export type ExperienceInput = z.infer<typeof ExperienceInputSchema>;
```

### 2. Handler Implementation
```typescript
// In src/mcp/experience-handler.ts
export class ExperienceHandler {
  async handle(params: ExperienceInput): Promise<ToolResult> {
    // 1. Validate input using Zod schema
    const validatedParams = ExperienceInputSchema.parse(params);
    
    // 2. Delegate to service layer
    const result = await experienceService(validatedParams);
    
    // 3. Format response for user
    return formatExperienceResult(result);
  }
}
```

### 3. Service Layer
```typescript
// In src/services/experience.ts
export async function experienceService(input: ExperienceInput): Promise<ExperienceResult> {
  // 1. Business logic implementation
  // 2. Storage operations
  // 3. Embedding generation
  // 4. Return structured result
}
```

### 4. Tool Registration
```typescript
// In src/mcp/tools.ts
export const tools = [
  {
    name: "experience",
    description: "Capture a meaningful moment with quality signatures",
    inputSchema: ExperienceInputJsonSchema,
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false
  }
];
```

## Error Handling Patterns

### MCP Error Response Format
```typescript
{
  error: {
    code: -32602, // Invalid params
    message: "Invalid input: experience must be an array of valid dimensions"
  }
}
```

### Validation Error Handling
```typescript
try {
  const validatedParams = ExperienceInputSchema.parse(params);
} catch (error) {
  if (error instanceof z.ZodError) {
    return {
      error: {
        code: -32602,
        message: `Invalid input: ${error.errors[0].message}`
      }
    };
  }
}
```

## Testing MCP Tools

### Handler Tests
```typescript
describe('ExperienceHandler', () => {
  it('should handle valid experience input', async () => {
    const handler = new ExperienceHandler();
    const result = await handler.handle({
      source: "I feel anxious",
      experience: ["mood.closed", "embodied.sensing"]
    });
    expect(result.content[0].text).toContain("Experienced");
  });
});
```

### Integration Tests
```typescript
// Use src/scripts/test-runner.ts for MCP protocol testing
// Test complete tool call flows with Claude
```

## Common MCP Patterns

### Tool Annotations
- **readOnlyHint**: `true` if tool doesn't modify state
- **destructiveHint**: `true` if tool can delete/irreversibly change data
- **idempotentHint**: `true` if repeated calls have no additional effect
- **openWorldHint**: `true` if tool interacts with external systems

### Response Formatting
```typescript
function formatExperienceResult(result: ExperienceResult): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: `Experienced (${result.experience.join(', ')})`
      }
    ]
  };
}
```

## MCP Protocol Compliance

### JSON-RPC 2.0 Format
- Use proper error codes (-32602 for invalid params, -32603 for internal error)
- Include request ID in responses
- Validate all inputs with Zod schemas
- Return structured error messages

### Tool Discovery
- Tools must be registered in `src/mcp/tools.ts`
- Each tool needs complete schema definition
- Include descriptive tool descriptions for AI discovery
- Provide examples in tool descriptions when helpful 