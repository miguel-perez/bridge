/**
 * Tests for MCP Tools
 */

import { getTools } from './tools.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  ExperienceInputSchema,
  SearchInputSchema,
  ReconsiderInputSchema,
  ReleaseInputSchema
} from './schemas.js';

// Mock the schemas module
jest.mock('./schemas.js', () => ({
  ExperienceInputSchema: {
    parse: jest.fn(),
    shape: {}
  },
  SearchInputSchema: {
    parse: jest.fn(),
    shape: {}
  },
  ReconsiderInputSchema: {
    parse: jest.fn(),
    shape: {}
  },
  ReleaseInputSchema: {
    parse: jest.fn(),
    shape: {}
  }
}));

// Mock zodToJsonSchema
jest.mock('zod-to-json-schema', () => ({
  zodToJsonSchema: jest.fn((schema) => ({
    type: 'object',
    properties: {},
    additionalProperties: false
  }))
}));

describe('MCP Tools', () => {
  describe('getTools', () => {
    it('should return array of 4 tools', async () => {
      const tools = await getTools();
      expect(tools).toHaveLength(4);
    });

    it('should have experience tool with correct properties', async () => {
      const tools = await getTools();
      const experienceTool = tools.find(t => t.name === 'experience');
      
      expect(experienceTool).toBeDefined();
      expect(experienceTool.name).toBe('experience');
      expect(experienceTool.description).toContain('Remember experiential moments');
      expect(experienceTool.readOnlyHint).toBe(false);
      expect(experienceTool.destructiveHint).toBe(false);
      expect(experienceTool.idempotentHint).toBe(false);
      expect(experienceTool.openWorldHint).toBe(false);
      expect(experienceTool.inputSchema).toBeDefined();
      expect(experienceTool.examples).toHaveLength(5);
    });

    it('should have recall tool with correct properties', async () => {
      const tools = await getTools();
      const recallTool = tools.find(t => t.name === 'recall');
      
      expect(recallTool).toBeDefined();
      expect(recallTool.name).toBe('recall');
      expect(recallTool.description).toContain('Search shared memories');
      expect(recallTool.readOnlyHint).toBe(true);
      expect(recallTool.destructiveHint).toBe(false);
      expect(recallTool.idempotentHint).toBe(true);
      expect(recallTool.openWorldHint).toBe(false);
      expect(recallTool.inputSchema).toBeDefined();
      expect(recallTool.examples).toHaveLength(5);
    });

    it('should have reconsider tool with correct properties', async () => {
      const tools = await getTools();
      const reconsiderTool = tools.find(t => t.name === 'reconsider');
      
      expect(reconsiderTool).toBeDefined();
      expect(reconsiderTool.name).toBe('reconsider');
      expect(reconsiderTool.description).toContain('Update existing experiences');
      expect(reconsiderTool.readOnlyHint).toBe(false);
      expect(reconsiderTool.destructiveHint).toBe(false);
      expect(reconsiderTool.idempotentHint).toBe(false);
      expect(reconsiderTool.openWorldHint).toBe(false);
      expect(reconsiderTool.inputSchema).toBeDefined();
      expect(reconsiderTool.inputSchema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(reconsiderTool.examples).toHaveLength(5);
    });

    it('should have release tool with correct properties', async () => {
      const tools = await getTools();
      const releaseTool = tools.find(t => t.name === 'release');
      
      expect(releaseTool).toBeDefined();
      expect(releaseTool.name).toBe('release');
      expect(releaseTool.description).toContain('Remove experiences');
      expect(releaseTool.readOnlyHint).toBe(false);
      expect(releaseTool.destructiveHint).toBe(true);
      expect(releaseTool.idempotentHint).toBe(true);
      expect(releaseTool.openWorldHint).toBe(false);
      expect(releaseTool.inputSchema).toBeDefined();
      expect(releaseTool.inputSchema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      expect(releaseTool.examples).toHaveLength(5);
    });

    it('should include examples with correct structure', async () => {
      const tools = await getTools();
      
      tools.forEach(tool => {
        tool.examples.forEach(example => {
          expect(example).toHaveProperty('id');
          expect(example).toHaveProperty('description');
          expect(example).toHaveProperty('input');
          expect(example).toHaveProperty('output');
          expect(example.output).toHaveProperty('content');
          expect(Array.isArray(example.output.content)).toBe(true);
          expect(example.output.content[0]).toHaveProperty('type', 'text');
          expect(example.output.content[0]).toHaveProperty('text');
        });
      });
    });

    it('should call zodToJsonSchema for each schema', async () => {
      await getTools();
      
      expect(zodToJsonSchema).toHaveBeenCalledWith(ExperienceInputSchema);
      expect(zodToJsonSchema).toHaveBeenCalledWith(SearchInputSchema);
      expect(zodToJsonSchema).toHaveBeenCalledWith(ReconsiderInputSchema);
      expect(zodToJsonSchema).toHaveBeenCalledWith(ReleaseInputSchema);
      expect(zodToJsonSchema).toHaveBeenCalledTimes(4);
    });

    it('should have proper descriptions with usage guidelines', async () => {
      const tools = await getTools();
      
      const experienceTool = tools.find(t => t.name === 'experience');
      expect(experienceTool.description).toContain('USE WHEN:');
      expect(experienceTool.description).toContain('EXAMPLES OF WHEN TO USE:');
      expect(experienceTool.description).toContain('DON\'T USE FOR:');
      expect(experienceTool.description).toContain('QUALITY SIGNATURES:');
      
      const recallTool = tools.find(t => t.name === 'recall');
      expect(recallTool.description).toContain('USE WHEN YOU WANT TO:');
      expect(recallTool.description).toContain('SEARCH APPROACHES:');
      expect(recallTool.description).toContain('SPECIAL SEARCHES:');
      
      const reconsiderTool = tools.find(t => t.name === 'reconsider');
      expect(reconsiderTool.description).toContain('USE WHEN:');
      expect(reconsiderTool.description).toContain('NATURAL WORKFLOW:');
      expect(reconsiderTool.description).toContain('COMMON UPDATES:');
      
      const releaseTool = tools.find(t => t.name === 'release');
      expect(releaseTool.description).toContain('USE SPARINGLY WHEN:');
      expect(releaseTool.description).toContain('NATURAL WORKFLOW:');
      expect(releaseTool.description).toContain('PHILOSOPHY:');
    });

    it('should have specific example scenarios', async () => {
      const tools = await getTools();
      
      // Experience tool examples
      const experienceTool = tools.find(t => t.name === 'experience');
      const expExampleIds = experienceTool.examples.map(e => e.id);
      expect(expExampleIds).toContain('user-emotional-experience');
      expect(expExampleIds).toContain('claude-experiential-response');
      expect(expExampleIds).toContain('collective-achievement');
      expect(expExampleIds).toContain('mixed-qualities');
      expect(expExampleIds).toContain('batch-experience');
      
      // Recall tool examples
      const recallTool = tools.find(t => t.name === 'recall');
      const recallExampleIds = recallTool.examples.map(e => e.id);
      expect(recallExampleIds).toContain('semantic-search');
      expect(recallExampleIds).toContain('filter-by-perspective');
      expect(recallExampleIds).toContain('claude-experiences');
      expect(recallExampleIds).toContain('date-range-search');
      expect(recallExampleIds).toContain('batch-search');
      
      // Reconsider tool examples
      const reconsiderTool = tools.find(t => t.name === 'reconsider');
      const reconsiderExampleIds = reconsiderTool.examples.map(e => e.id);
      expect(reconsiderExampleIds).toContain('add-missing-quality');
      expect(reconsiderExampleIds).toContain('correct-perspective');
      expect(reconsiderExampleIds).toContain('fix-source-typo');
      expect(reconsiderExampleIds).toContain('use-base-quality');
      expect(reconsiderExampleIds).toContain('batch-reconsider');
      
      // Release tool examples
      const releaseTool = tools.find(t => t.name === 'release');
      const releaseExampleIds = releaseTool.examples.map(e => e.id);
      expect(releaseExampleIds).toContain('user-requested-removal');
      expect(releaseExampleIds).toContain('test-capture-cleanup');
      expect(releaseExampleIds).toContain('incomplete-moment');
      expect(releaseExampleIds).toContain('release-without-reason');
      expect(releaseExampleIds).toContain('batch-release');
    });

    it('should have consistent tool structure', async () => {
      const tools = await getTools();
      
      tools.forEach(tool => {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool).toHaveProperty('readOnlyHint');
        expect(tool).toHaveProperty('destructiveHint');
        expect(tool).toHaveProperty('idempotentHint');
        expect(tool).toHaveProperty('openWorldHint');
        expect(tool).toHaveProperty('examples');
        expect(typeof tool.readOnlyHint).toBe('boolean');
        expect(typeof tool.destructiveHint).toBe('boolean');
        expect(typeof tool.idempotentHint).toBe('boolean');
        expect(typeof tool.openWorldHint).toBe('boolean');
      });
    });
  });

  describe('makeDraft202012Schema', () => {
    it('should add $schema property to reconsider and release tools', async () => {
      const tools = await getTools();
      
      const reconsiderTool = tools.find(t => t.name === 'reconsider');
      expect(reconsiderTool.inputSchema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
      
      const releaseTool = tools.find(t => t.name === 'release');
      expect(releaseTool.inputSchema.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    });

    it('should not add $schema property to experience and recall tools', async () => {
      const tools = await getTools();
      
      const experienceTool = tools.find(t => t.name === 'experience');
      expect(experienceTool.inputSchema.$schema).toBeUndefined();
      
      const recallTool = tools.find(t => t.name === 'recall');
      expect(recallTool.inputSchema.$schema).toBeUndefined();
    });
  });
});