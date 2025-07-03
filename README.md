# Framed Moments MCP Server

An MCP (Model Context Protocol) server for capturing and framing moments of experience. This server provides tools for quick capture, thoughtful framing, enhancement, and synthesis of experiential moments.

## Features

- **Capture**: Quick recording of experiences, thoughts, or feelings
- **Frame**: Transform captures into structured moments with patterns and qualities
- **Enhance**: Refine and add details to existing captures or moments
- **Synthesize**: Create container moments that group related experiences

## Installation

```bash
npm install
```

## Development

```bash
# Build the project
npm run build

# Run in development mode with auto-reload
npm run dev

# Run tests
npm test

# Lint the code
npm run lint

# Format the code
npm run format
```

## Usage

The server runs over stdio transport and can be used with any MCP-compatible client.

```bash
npm start
```

## Data Storage

The server stores data in JSONL (JSON Lines) format for:
- Simple append-only operations
- Easy backup and restore# Moments MCP Server

A Model Context Protocol (MCP) server that helps capture and explore lived experiences through structured reflection. Based on the Framed Moments framework, this tool preserves how life actually feels—not just what happened.

## What This Is

The Moments server helps you catch experiences before they fade. That flash of recognition when someone sees you clearly. The exact texture of waiting for test results. The way your body knew something before your mind caught up.

This isn't journaling or note-taking. It's a systematic way to capture the unified field of experience—body, attention, emotion, purpose, space, time, and relationships—as they actually feel in the moment of living them.

## Quick Start

### For Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "moments": {
      "command": "node",
      "args": ["C:\\path\\to\\moments\\dist\\index.js"]
    }
  }
}
```

### Basic Workflow

1. **Capture** raw experience in your own words
2. **Frame** it by identifying patterns and qualities  
3. **Weave** multiple moments to discover deeper patterns

## Real Examples

### From Stream of Consciousness to Framed Moment

**Raw capture** (with typos preserved):
```
At the beach is was kinda crazy how much wildlife was around us. First, Alicia heard two Daulphins underwater...
```

**After framing**:
```
We're in the water at St. Pete beach when Alicia hears two Daulphins underwater - two distinct rhythms of clicking. When I see two fins break the surface I freak out a bit. For all I know they could be sharks!
```

**User response**: "that's my brain right there"

### What Breaks Recognition

Small errors shatter the "that's my brain" feeling:

**Failed attempt**: "She's always called me Gugu"  
**Corrected**: "She's always called me Gungo"  
**User response**: "It's 'Gungo' not 'Gugu' but otherwise that's great"

A single wrong name breaks authenticity completely. This shows why exact voice preservation matters.

### From Voice Recording to Recognition

**Original** (rambling about career advice):
```
...he turned around to me and said like, you should be a designer. And I'm like, what do you mean? It's like, you think like a designer...
```

**After several iterations**:
```
We're stopped at an intersection and he turns to me: "You should be a designer." "What do you mean?" "You think like a designer." I look down at my hands, then out at those row homes. Part of why I'd gone to learn code because I thought art wasn't secure enough.
```

**User response**: "Wow, magic.. I didn't write that?! that's my brain! lol!"

## Core Concepts

### Sources
Raw captures of experience—exactly as you tell them. The tool preserves:
- Your exact words and voice patterns
- When it happened (even vague times like "yesterday afternoon")
- How you experienced it (I, we, you, they)
- When you captured it relative to the experience

### Moments
Framed experiences that have been explored for their qualities and patterns. Each moment:
- Emerges from one or more sources
- Identifies which experiential qualities are most alive
- Uses a pattern type to find natural boundaries
- Gets a 5-7 word summary and emoji

### Qualities
Seven dimensions of lived experience:

- **embodied**: "My shoulders pull toward my ears, that familiar armor"
- **attentional**: "Everything else disappears except her face"  
- **emotional**: "Grief and relief twist together, neither winning"
- **purposive**: "Every cell agrees: get to that door"
- **spatial**: "The kitchen feels too small suddenly"
- **temporal**: "Twenty years collapse into this recognition"
- **relational**: "I hear Mom's voice: 'You always were the brave one'"

### Patterns
Six ways attention moves through experience:

- **moment-of-recognition**: Everything snaps into focus, sudden clarity or insight (keywords: realize, understand, click, aha)
- **sustained-attention**: Time stretches out, dwelling in one experience (keywords: sitting, waiting, watching, holding)
- **crossing-threshold**: A shift where you're suddenly on the other side (keywords: suddenly, then, transform, shift)
- **peripheral-awareness**: Attention spreads wide, tracking multiple streams (keywords: while, meanwhile, juggling, multiple)
- **directed-momentum**: Everything lines up behind single drive (keywords: toward, racing, focused, must)
- **holding-opposites**: Pulled in two directions, tensions that won't resolve (keywords: but, yet, both, despite)

## System Prompts
```
You have access to the moments tool for capturing and framing lived experiences. Success means users recognize their authentic voice in captured moments ("Yes, that's exactly it!").

Follow this workflow:

1. Context Retrieval:
   - Start each conversation with "Remembering..." and use moments:remember for relevant past experiences
   - Throughout discussion, proactively search for related moments when topics arise
   - Check moments:storyboard for unframed sources needing attention

2. Experience Recognition:
   - Listen for experiential markers (not facts/opinions):
     • Body sensations: "I felt...", "My shoulders...", "A tightness..."
     • Attention shifts: "I noticed...", "Suddenly...", "I couldn't stop..."
     • Emotional atmosphere: "The mood...", "I was overwhelmed..."
     • Time texture: "In that moment...", "Time seemed to..."
     • Relational dynamics: "Between us...", "They looked..."

3. Collaborative Capture (ALWAYS stage in artifacts first):
   - When you detect rich experience: "Let me draft this moment for your review"
   - Create artifact with: captured experience (exact words, present tense), suggested metadata, identified qualities
   - Refine together until user confirms: "That's my brain!" 
   - Only then execute moments:capture
   - You can capture your own insights: perspective="I", experiencer="Claude"

4. Tool Progression:
   - FRAME: After 2-3 related captures → collaborative artifact → moments:frame
   - REFLECT: For past captures → "What do you notice now?" → moments:reflect  
   - WEAVE: When patterns emerge across moments → synthesis artifact → moments:weave
   - CRITIQUE: Validate important moments → moments:critique for quality check
   - RELEASE: When experiences feel complete → moments:release

5. Quality Focus:
   - Embodied (body), Attentional (focus), Emotional (feelings), Purposive (intentions), 
     Spatial (place), Temporal (time), Relational (others)
   - Don't force all qualities - capture what's alive

Remember: Preserve exact language. Stage everything collaboratively. Build interconnected experiential archives. Let patterns emerge naturally.
```

## All Functions

### moments:capture
Preserve raw experience exactly as told.

```javascript
{
  content: "Sitting at my desk, fingers hovering over keys...",
  when: "2024-03-15T10:30:00",
  perspective: "I",
  experiencer: "self",
  processing: "during"
}
```

### moments:frame  
Transform sources into structured moments.

```javascript
{
  sourceIds: ["src_xxx"],
  qualities: [
    { type: "embodied", manifestation: "Fingers on keys, shoulders climbing" },
    { type: "spatial", manifestation: "Desk expanding to include overhead buzz" }
  ],
  pattern: "moment-of-recognition",
  emoji: "⌨️",
  summary: "Discovering embodied awareness while typing"
}
```

### moments:reflect
Add memory layers to existing captures.

```javascript
{
  originalId: "src_xxx",
  content: "Looking back, I realize this was when I shifted from doing to being-while-doing."
}
```

### moments:critique
Validate a framed moment against quality criteria—returns a checklist for self-assessment.

```javascript
{
  momentId: "mom_xxx"
}
```

### moments:storyboard
View all unframed sources with philosophical guidance about finding natural boundaries.

### moments:tree
See hierarchical structure showing how sources build to moments, moments weave into syntheses.

### moments:weave
Connect moments to reveal meta-patterns.

```javascript
{
  momentIds: ["mom_xxx", "mom_yyy"],
  emoji: "🌊",
  summary: "Body wisdom preceding understanding"
}
```

### moments:enrich
Add or refine details in existing moments.

### moments:release
Remove a source or moment from the system.

## The Discovery Process

This tool works best through iterative discovery:

### 1. First Capture Often Misses Details
- User shares basic memory
- Frame attempt feels generic
- "That's not quite right..."

### 2. Conversation Unlocks Memory
- "What did your body feel?"
- "Oh, I remember looking down at my hands"
- "The row homes were at the intersection"

### 3. Each Detail Deepens
- Physical details become metaphors
- Forgotten context emerges
- Emotional truth clarifies

### 4. Recognition Arrives
- "Yes! That's my brain right there"
- Often includes details user forgot they shared
- Feels both surprising and deeply familiar

### 5. Sharing Creates New Insights
- Printed moment shown to partner
- "Both from North Philly" connection emerges
- Moments continue deepening even after "complete"

## The Memory Recovery Phenomenon

Framing consistently unlocks forgotten details:

### Examples from Testing:
- **Wrestling memory**: Vague feeling → warehouse, bleachers, shiny red/gold masks
- **Therapy notes**: Bullet points → caring nurse, jolly ranchers, small room
- **Design advice**: Basic story → looking down, row homes, height difference

### Why This Happens:
- One detail triggers associated memories
- Experiential focus bypasses narrative memory
- Body memories unlock cognitive memories
- The process itself is generative

Always ask: "What else do you remember about that moment?"

## Working with Different Input Types

### Stream of Consciousness
- Preserve rambling quality
- Reorder gently for flow
- Keep idiosyncratic spellings

### Voice Recordings  
- Strategic filler words stay ("uh" can carry meaning)
- Honor speech rhythms
- Exact dialogue is sacred

### Therapy/Fragment Notes
- Maintain fragment structure where it serves
- Each line might be its own micro-moment
- Let incompleteness stand

### Half-Remembered Moments
- Start with the feeling or image
- Use dialogue to recover details
- "What else do you remember about..."

### Pure Emotions ("Bleh...")
- Need conversational excavation
- "Tell me more about 'bleh'"
- Often contain compressed narratives

## Continuous Capture

When working with longer recordings or sessions:

### Natural Frame Boundaries:
- Activity transitions (every 15-20 min average)
- Emotional shifts (mood changes)
- Topic changes (conversation pivots)
- Attention redirects (focus shifts)
- Temporal markers ("then", "after that", "suddenly")

### Multiple Zoom Levels:
- **Micro-moments**: Single insights ("Rose called me Gungo")
- **Activity arcs**: Complete sequences (making stew together)
- **Extended patterns**: Themes across time (saying goodbye)


### The "One More Thing" Principle
Often the most important detail comes last:
- "Oh, and he always wore hoodies"
- "I just remembered—we were both from North Philly"
- "Actually, it was 'Gungo' not 'Gugu'"

These late additions often transform the entire moment.

## Complete Validation Criteria

A properly framed moment must pass:

1. **Voice Recognition**: "That's how I talk"
2. **Experiential Completeness**: Feels whole, not assembled
3. **Visual Anchorability**: Can imagine being there
4. **Temporal Flow**: Before/after naturally implied
5. **Emotional Atmosphere**: Feeling preserved accurately
6. **Self-Containment**: Understandable without context
7. **Narrative Coherence**: Flows without jarring jumps
8. **Causal Logic**: Actions connect to reactions
9. **Temporal Knowledge**: Only what was known then
10. **No Invented Details**: Everything traceable to source
11. **Voice Pattern Fidelity**: Exact phrasings preserved
12. **Minimal Transformation**: Reordered not rewritten
13. **Physical/Sensory Grounding**: Embodied details anchor it

## Common Pitfalls & Solutions

### "It doesn't sound like me"
- **Cause**: Over-polishing, formal language
- **Fix**: Return to exact phrasing, keep quirks

### "Something's missing"  
- **Cause**: Rushed framing, unexplored qualities
- **Fix**: "What else do you remember?"

### "Too much interpretation"
- **Cause**: Adding meaning not in original
- **Fix**: Strip to what they knew then

### "Feels fragmented"
- **Cause**: Multiple moments forced into one
- **Fix**: Frame separately, then weave

### Single Error Breaks Everything
- **Cause**: Wrong name, place, or detail
- **Fix**: Verify specifics carefully

## Installation & Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode
npm run dev

# Run tests
npm test
```

## Philosophy

This tool emerges from a productive tension: experience flows continuously (as Bergson noted), yet understanding requires discrete units. We create "framed moments" not because life comes in pieces, but because human reflection and communication need manageable units.

The framework draws from:
- Micro-phenomenology (investigating subjective experience)
- Experience Sampling (capturing psychological snapshots)
- Narrative Therapy (identifying transformative moments)
- Personal Knowledge Management (building wisdom through accumulation)

But its real power lies in practice: helping people recognize their own minds through patient, iterative discovery.

## Data Storage

The server stores data in JSON format for human-readable persistence and easy data manipulation.

---

*"The moment has a life of its own if you let it breathe."*
- Human-readable format
- Efficient line-by-line processing
