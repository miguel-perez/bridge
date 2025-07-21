# Bridge JSDoc Documentation Rubric

**Document Purpose**: This rubric provides specific guidance for documenting Bridge code, adapted from the general TypeScript JSDoc rubric to match Bridge's architecture and current documentation state.

**For Developers**: Use this to maintain consistent, high-quality documentation across the Bridge codebase.

## Documentation Priority Levels

- **🔴 Required**: Must have documentation
- **🟡 Recommended**: Should have documentation unless trivial  
- **🟢 Optional**: Nice to have for complex cases
- **⚪ Not Needed**: Avoid to prevent clutter

## 1. Functions and Methods

### 🔴 Required when:
- **MCP Tool Handlers** (`src/mcp/*-handler.ts`) - These are public API endpoints
- **Service Methods** (`src/services/*.ts`) - Core business logic with side effects
- **Non-obvious behavior** that isn't clear from name/types
- **Throws exceptions** that callers need to handle
- **Complex algorithms** (like unified scoring, embedding generation)

```typescript
/**
 * Processes an experience capture request with validation and storage
 * @remarks
 * Generates embeddings using Xenova transformers for semantic search.
 * Validates experiential qualities against known dimensions.
 * Stores both source and embedding records atomically.
 * @example
 * ```ts
 * const result = await experienceService.rememberExperience({
 *   source: "I feel anxious about tomorrow's presentation",
 *   experience: ["embodied.sensing", "mood.closed"]
 * });
 * console.log(`Experienced: ${result.source.id}`);
 * ```
 * @throws {ValidationError} When experiential qualities are invalid
 * @throws {StorageError} When persistence fails
 */
async rememberExperience(input: ExperienceInput): Promise<ExperienceResult> {
```

### 🟡 Recommended when:
- **Helper functions** with specific constraints (like formatters, validators)
- **Performance considerations** exist (like embedding generation)
- **Deprecated** functions needing migration path

### 🟢 Optional when:
- Internal utilities with clear names
- Simple getters/setters
- Straightforward transformations

### ⚪ Not Needed when:
- Function name and types fully explain behavior
- Private methods with obvious intent
- Simple event handlers

## 2. Classes

### 🔴 Required when:
- **Service Classes** (`ExperienceService`, `RecallService`, etc.) - Core business logic
- **MCP Server** - Public API entry point
- **Lifecycle requirements** (initialization, cleanup)

```typescript
/**
 * Manages experiential data capture, storage, and retrieval
 * @remarks
 * Handles the complete lifecycle of experiential data from capture to storage.
 * Generates embeddings for semantic search using local transformers.
 * Provides atomic operations for data consistency.
 * 
 * @example
 * ```ts
 * const service = new ExperienceService();
 * 
 * // Capture an experience
 * const result = await service.rememberExperience({
 *   source: "Feeling focused while coding",
 *   experience: ["embodied.thinking", "focus.sharp"]
 * });
 * 
 * // Service automatically handles embedding generation and storage
 * ```
 */
export class ExperienceService {
```

### 🟡 Recommended when:
- Abstract base classes
- Classes with complex inheritance
- State machines or complex workflows

## 3. Interfaces and Types

### 🔴 Required when:
- **Core Domain Models** (`Source`, `Experience`, `EmbeddingRecord`) - Central to the application
- **MCP Tool Schemas** - Public API contracts
- **Configuration objects** with non-obvious options

```typescript
/**
 * A captured experiential moment with analysis
 * @remarks
 * Represents a single moment of human experience with phenomenological analysis.
 * The `experience` field contains prominent quality dimensions that emerged.
 * `reflects` field enables pattern realizations that connect multiple experiences.
 * @example
 * ```ts
 * const source: Source = {
 *   id: "exp-123",
 *   source: "I feel anxious about tomorrow's presentation",
 *   created: "2025-01-21T10:30:00Z",
 *   experience: ["embodied.sensing", "mood.closed"],
 *   reflects: ["exp-456", "exp-789"] // Links to related experiences
 * };
 * ```
 */
export interface Source {
  /** Unique identifier for this source */
  id: string;
  /** The captured source (text, audio transcript, etc.) */
  source: string;
  /** When the experience was captured (auto-generated) */
  created: string;
  
  // Context fields
  /** Perspective from which experience is captured */
  perspective?: Perspective;
  /** Who experienced this (default: "self") */
  experiencer?: string;
  /** When processing occurred relative to experience */
  processing?: ProcessingLevel;
  /** Whether this is crafted content (blog) vs raw experience (journal) */
  crafted?: boolean;
  
  // Analysis fields
  /** Experience analysis results (prominent qualities) */
  experience?: Experience;
  
  // Pattern realization fields
  /** Array of experience IDs that this experience reflects on/connects to */
  reflects?: string[];
}
```

### ⚪ Not Needed when:
- Property names are self-documenting
- Types are used locally within a module
- Simple data transfer objects

## 4. Constants and Enums

### 🔴 Required when:
- **Quality Dimensions** (`QUALITY_TYPES`) - Business rules for experiential analysis
- **Configuration Thresholds** - Performance and behavior limits
- **Magic numbers** or business rules

```typescript
/**
 * Valid experiential quality dimensions for phenomenological analysis
 * @remarks
 * These dimensions capture the seven core aspects of human experience:
 * - embodied: Physical sensations and somatic awareness
 * - focus: Attentional patterns and awareness distribution  
 * - mood: Emotional qualities and feeling tones
 * - purpose: Intentions and goal-oriented aspects
 * - space: Environmental awareness and positioning
 * - time: Time perception and flow
 * - presence: Relational and social dimensions
 * 
 * Used for validating experiential quality inputs and generating embeddings.
 */
export const QUALITY_TYPES = [
  'embodied', 'focus', 'mood', 'purpose',
  'space', 'time', 'presence'
] as const;

/**
 * Default configuration values for Bridge operations
 * @remarks
 * These defaults ensure consistent behavior across the application.
 * Can be overridden via environment variables or configuration files.
 */
export const DEFAULTS = {
  /** Default perspective for captured experiences */
  PERSPECTIVE: 'I' as const,
  /** Default experiencer identifier */
  EXPERIENCER: 'self',
  /** Default processing timing relative to experience */
  PROCESSING: 'during' as const,
  /** Default content type for captured experiences */
  CONTENT_TYPE: 'text' as const,
  /** Default crafted content flag */
  CRAFTED: false,
} as const;
```

## 5. Bridge-Specific Documentation Patterns

### MCP Tool Handlers
All MCP tool handlers should follow this pattern:

```typescript
/**
 * Handles experience capture requests from MCP clients
 * @remarks
 * Validates input using Zod schemas, delegates to ExperienceService,
 * and returns user-friendly responses. Handles errors gracefully
 * with appropriate error messages.
 * @example
 * ```ts
 * // MCP client call
 * const result = await experienceHandler.handle({
 *   source: "I feel anxious about tomorrow's presentation",
 *   experience: ["embodied.sensing", "mood.closed"]
 * });
 * // Returns: "Experienced (embodied.sensing, mood.closed)"
 * ```
 * @throws {ValidationError} When input validation fails
 * @throws {ServiceError} When underlying service operations fail
 */
async handle(params: ExperienceParams): Promise<ExperienceResult> {
```

### Service Methods
Service methods should document business logic and side effects:

```typescript
/**
 * Performs semantic search with unified scoring across multiple factors
 * @remarks
 * Combines text similarity (40%), dimensional matching (30%), 
 * temporal relevance (20%), and filter compliance (10%) for optimal results.
 * Uses local transformer embeddings for semantic similarity.
 * @example
 * ```ts
 * const results = await recallService.search("anxiety patterns", {
 *   filter: { reflects: "only" },
 *   limit: 10
 * });
 * ```
 * @throws {EmbeddingError} When embedding generation fails
 * @throws {StorageError} When data retrieval fails
 */
async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
```

### Configuration Objects
Configuration should explain the impact of each option:

```typescript
/**
 * Configuration for Bridge MCP server behavior
 * @remarks
 * These settings control performance, storage, and feature availability.
 * Most settings can be overridden via environment variables.
 */
interface BridgeConfig {
  /** Maximum number of experiences to return in search results (default: 20) */
  maxSearchResults?: number;
  /** Embedding model to use for semantic search (default: "all-MiniLM-L6-v2") */
  embeddingModel?: string;
  /** Whether to enable pattern realization features (default: true) */
  enablePatternRealizations?: boolean;
  /** Storage file path for experiences (default: "~/.bridge/experiences.json") */
  storagePath?: string;
}
```

## 6. Useful JSDoc Tags for Bridge

### High-Value Tags:
- `@example` - Show real MCP tool usage patterns
- `@remarks` - Explain "why" and Bridge-specific context
- `@throws` - Document exceptions (especially for MCP handlers)
- `@deprecated` - Mark for removal with migration path
- `@see` - Link to related MCP tools or services
- `@since` - Track API versions

### Bridge-Specific Context:
- Always mention MCP protocol implications
- Explain experiential quality dimensions when relevant
- Document embedding generation behavior
- Note pattern realization features

## 7. Anti-Patterns to Avoid

### ❌ Don't do this:
```typescript
/**
 * Gets the source by ID
 * @param id - The source ID
 * @returns The source
 */
function getSourceById(id: string): Source {
```

### ✅ Do this instead:
```typescript
/**
 * Retrieves a captured experience by ID with full context
 * @remarks
 * Returns the complete Source record including experiential analysis
 * and any pattern realization links. Throws if experience not found.
 * @example
 * ```ts
 * const source = await getSourceById("exp-123");
 * console.log(`Found: ${source.source} with ${source.experience?.length} qualities`);
 * ```
 * @throws {NotFoundError} When experience ID doesn't exist
 */
function getSourceById(id: string): Source {
```

## 8. Bridge Code Review Checklist

- [ ] MCP tool handlers have comprehensive JSDoc with examples
- [ ] Service methods document business logic and side effects
- [ ] Core types (`Source`, `Experience`) have detailed documentation
- [ ] Configuration objects explain impact of each option
- [ ] Examples show real MCP tool usage patterns
- [ ] Throws tags document all exceptions
- [ ] Links to related MCP tools use @see tags
- [ ] Experiential quality dimensions are explained when relevant
- [ ] Pattern realization features are documented
- [ ] No redundant documentation of obvious code

## 9. Current Bridge Documentation Status

### ✅ Well Documented:
- `src/mcp/tools.ts` - MCP tool definitions with good context
- `src/core/types.ts` - Core types with basic documentation
- `src/services/experience.ts` - Service methods with some documentation

### 🔴 Needs Improvement:
- `src/mcp/*-handler.ts` - MCP handlers need comprehensive documentation
- `src/services/recall.ts` - Complex search logic needs better documentation
- `src/services/unified-scoring.ts` - Algorithm needs detailed explanation
- `src/core/config.ts` - Configuration options need impact documentation

### 🟡 Could Be Enhanced:
- `src/utils/formatters.ts` - Helper functions could use more context
- `src/scripts/*.ts` - Scripts need purpose and usage documentation

## 10. Implementation Priority

1. **High Priority**: MCP tool handlers (public API)
2. **Medium Priority**: Service methods (business logic)
3. **Low Priority**: Utility functions and scripts

## 11. Automation Configuration

Configure ESLint for Bridge-specific JSDoc rules:

```json
{
  "rules": {
    "tsdoc/syntax": "error",
    "jsdoc/require-jsdoc": ["error", {
      "publicOnly": true,
      "require": {
        "FunctionDeclaration": true,
        "ClassDeclaration": true,
        "MethodDefinition": true
      },
      "contexts": [
        "ExportNamedDeclaration > FunctionDeclaration",
        "ExportDefaultDeclaration > FunctionDeclaration",
        "ClassDeclaration > MethodDefinition"
      ]
    }],
    "jsdoc/require-param": "off",
    "jsdoc/require-returns": "off",
    "jsdoc/require-description": "error"
  }
}
```

This rubric ensures Bridge documentation is consistent, helpful, and focused on the unique aspects of experiential data capture and MCP protocol integration. 