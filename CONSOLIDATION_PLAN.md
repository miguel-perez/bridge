# Tool Consolidation Plan: Smart Defaults with Manual Override

## Overview
Consolidate 4 tools into 2 smart tools that provide AI-generated defaults when minimal input is given, but allow full manual control when detailed parameters are provided.

## Current State
- **autoframe**: `sourceId` → AI generates complete moment
- **frame**: `sourceIds` + manual parameters → manual moment creation
- **autoweave**: `momentIds` → AI generates complete scene  
- **weave**: `momentIds` + manual parameters → manual scene creation

## Target State
- **frame**: Smart default OR manual override
- **weave**: Smart default OR manual override

## Implementation Plan

### Phase 1: Schema Updates

#### 1.1 Update frameSchema
```typescript
const frameSchema = z.object({
  sourceIds: z.array(z.string()).min(1),
  // Smart default mode: only sourceIds provided
  // Manual override mode: provide additional parameters
  emoji: z.string().optional(),
  summary: z.string().optional(), 
  qualities: z.array(z.object({
    type: z.enum([...]),
    manifestation: z.string().min(1)
  })).optional(),
  narrative: z.string().optional(),
  shot: z.enum([...]).optional(),
});
```

#### 1.2 Update weaveSchema  
```typescript
const weaveSchema = z.object({
  momentIds: z.array(z.string()).min(1),
  // Smart default mode: only momentIds provided
  // Manual override mode: provide additional parameters
  emoji: z.string().optional(),
  summary: z.string().optional(),
  narrative: z.string().optional(), 
  shot: z.enum([...]).optional(),
});
```

### Phase 2: Tool Definition Updates

#### 2.1 Update frame tool definition
```typescript
{
  name: "frame",
  description: "Transform sources into moments. Provide only sourceIds for AI-generated framing, or include additional parameters for manual control.",
  inputSchema: {
    type: "object", 
    properties: {
      sourceIds: { type: "array", items: { type: "string" }, minItems: 1, description: "Array of source IDs to frame together" },
      emoji: { type: "string", description: "Single emoji (optional - AI generates if not provided)" },
      summary: { type: "string", description: "5-7 word summary (optional - AI generates if not provided)" },
      shot: { type: "string", enum: [...], description: "Attention pattern (optional - AI generates if not provided)" },
      qualities: { type: "array", items: {...}, description: "Experiential qualities (optional - AI generates if not provided)" },
      narrative: { type: "string", description: "Full narrative (optional - AI generates if not provided)" }
    },
    required: ["sourceIds"]
  }
}
```

#### 2.2 Update weave tool definition
```typescript
{
  name: "weave", 
  description: "Connect moments into scenes. Provide only momentIds for AI-generated weaving, or include additional parameters for manual control.",
  inputSchema: {
    type: "object",
    properties: {
      momentIds: { type: "array", items: { type: "string" }, minItems: 1, description: "Array of moment IDs to weave together" },
      emoji: { type: "string", description: "Emoji representing the journey (optional - AI generates if not provided)" },
      summary: { type: "string", description: "5-7 word summary (optional - AI generates if not provided)" },
      narrative: { type: "string", description: "The connecting story (optional - AI generates if not provided)" },
      shot: { type: "string", enum: [...], description: "Overall attention pattern (optional - AI generates if not provided)" }
    },
    required: ["momentIds"]
  }
}
```

### Phase 3: Handler Logic Updates

#### 3.1 Update frame handler
```typescript
case 'frame': {
  const input = frameSchema.parse(args);
  
  // Determine mode based on provided parameters
  const isSmartDefault = !input.emoji && !input.summary && !input.qualities && !input.narrative && !input.shot;
  
  if (isSmartDefault) {
    // Smart default: use AutoProcessor
    const autoProcessor = new AutoProcessor();
    const result = await autoProcessor.autoFrameSources({ sourceIds: input.sourceIds });
    // Handle result similar to current autoframe
  } else {
    // Manual override: use existing frame logic
    // Validate all sources exist
    // Create moment with provided parameters
  }
}
```

#### 3.2 Update weave handler
```typescript
case 'weave': {
  const input = weaveSchema.parse(args);
  
  // Determine mode based on provided parameters  
  const isSmartDefault = !input.emoji && !input.summary && !input.narrative && !input.shot;
  
  if (isSmartDefault) {
    // Smart default: use AutoProcessor
    const autoProcessor = new AutoProcessor();
    const result = await autoProcessor.autoWeaveMoments(input.momentIds);
    // Handle result similar to current autoweave
  } else {
    // Manual override: use existing weave logic
    // Validate all moments exist
    // Create scene with provided parameters
  }
}
```

### Phase 4: Remove Deprecated Tools

#### 4.1 Remove from tool list
- Remove `autoframe` tool definition
- Remove `autoweave` tool definition

#### 4.2 Remove handlers
- Remove `case 'autoframe'` handler
- Remove `case 'autoweave'` handler

### Phase 5: Update Documentation & Prompts

#### 5.1 Update contextual prompts
```typescript
function getContextualPrompts(toolName: string): string {
  let prompts = '\n✓ Next steps:\n';
  switch(toolName) {
    case 'frame':
      prompts += '• Smart default: just provide sourceIds for AI-generated framing\n';
      prompts += '• Manual control: include emoji, summary, qualities, narrative, shot\n';
      prompts += '• Weave - connect with moments that reflect on each other\n';
      break;
    case 'weave':
      prompts += '• Smart default: just provide momentIds for AI-generated weaving\n';
      prompts += '• Manual control: include emoji, summary, narrative, shot\n';
      prompts += '• Use hierarchy/group view in search to visualize your new scene\n';
      break;
    // ... other cases
  }
  return prompts;
}
```

#### 5.2 Update capture autoframe integration
```typescript
// In capture handler, update the autoframe call
const autoProcessor = new AutoProcessor();
const autoframeResult = await autoProcessor.autoFrameSources({ sourceIds: [source.id] });
// This now uses the same AutoProcessor that frame tool uses
```

### Phase 6: Testing & Validation

#### 6.1 Test smart default mode
- Test `frame` with only `sourceIds`
- Test `weave` with only `momentIds`
- Verify AI generation works correctly

#### 6.2 Test manual override mode
- Test `frame` with all parameters provided
- Test `weave` with all parameters provided  
- Verify manual parameters take precedence

#### 6.3 Test edge cases
- Test partial parameter combinations
- Test validation errors
- Test error handling

### Phase 7: Migration Strategy

#### 7.1 Backward compatibility
- Existing `autoframe` calls can be replaced with `frame` calls
- Existing `autoweave` calls can be replaced with `weave` calls
- No breaking changes to existing functionality

#### 7.2 Documentation updates
- Update README.md with new tool descriptions
- Update examples to show both smart default and manual modes
- Update any external documentation

## Benefits of This Approach

1. **Simplified UX**: Users only need to remember 2 tools instead of 4
2. **Smart defaults**: AI does the heavy lifting when minimal input is provided
3. **Manual control**: Full control when detailed parameters are specified
4. **Progressive disclosure**: Start simple, add detail as needed
5. **Consistent pattern**: Both tools follow the same smart default + manual override pattern
6. **Reduced cognitive load**: Fewer tools to choose from
7. **Maintained functionality**: All existing capabilities preserved

## Implementation Order

1. **Schema updates** (Phase 1) ✅ **COMPLETED**
2. **Tool definition updates** (Phase 2) ✅ **COMPLETED** 
3. **Handler logic updates** (Phase 3) ✅ **COMPLETED**
4. **Remove deprecated tools** (Phase 4) ✅ **COMPLETED**
5. **Update documentation** (Phase 5) ✅ **COMPLETED**
6. **Testing** (Phase 6) 🔄 **IN PROGRESS**
7. **Migration** (Phase 7) ⏳ **PENDING**

## Risk Mitigation

- **Gradual rollout**: Implement phases incrementally
- **Extensive testing**: Test both modes thoroughly
- **Backward compatibility**: Ensure existing workflows continue to work
- **Clear documentation**: Help users understand the new patterns
- **Error handling**: Robust error messages for both modes 