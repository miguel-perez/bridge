/**
 * Tests for MCP Tools
 */

import { getTools } from './tools.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { ExperienceInputSchema, ReconsiderInputSchema } from './schemas.js';

// Mock the schemas module
jest.mock('./schemas.js', () => ({
  ExperienceInputSchema: {
    parse: jest.fn(),
    shape: {},
  },
  ReconsiderInputSchema: {
    parse: jest.fn(),
    shape: {},
  },
}));

// Mock zodToJsonSchema
jest.mock('zod-to-json-schema', () => ({
  zodToJsonSchema: jest.fn(() => ({
    type: 'object',
    properties: {},
    additionalProperties: false,
  })),
}));

describe('MCP Tools', () => {
  describe('getTools', () => {
    it('should return array of 2 tools', async () => {
      const tools = await getTools();
      expect(tools).toHaveLength(2);
    });

    it('should have experience tool with correct properties', async () => {
      const tools = await getTools();
      const experienceTool = tools.find((t) => t.name === 'experience') as any;

      expect(experienceTool).toBeDefined();
      expect(experienceTool.name).toBe('experience');
      expect(experienceTool.description).toContain(
        'Remember experiential moments that shape conversations'
      );
      expect(experienceTool.readOnlyHint).toBe(false);
      expect(experienceTool.destructiveHint).toBe(false);
      expect(experienceTool.idempotentHint).toBe(false);
      expect(experienceTool.openWorldHint).toBe(false);
      expect(experienceTool.inputSchema).toBeDefined();
      expect(experienceTool.examples).toHaveLength(8);
    });

    it('should have reconsider tool with correct properties', async () => {
      const tools = await getTools();
      const reconsiderTool = tools.find((t) => t.name === 'reconsider') as any;

      expect(reconsiderTool).toBeDefined();
      expect(reconsiderTool.name).toBe('reconsider');
      expect(reconsiderTool.description).toContain(
        'Update or release experiences as understanding evolves'
      );
      expect(reconsiderTool.readOnlyHint).toBe(false);
      expect(reconsiderTool.destructiveHint).toBe(false);
      expect(reconsiderTool.idempotentHint).toBe(false);
      expect(reconsiderTool.openWorldHint).toBe(false);
      expect(reconsiderTool.inputSchema).toBeDefined();
      expect(reconsiderTool.inputSchema.$schema).toBe(
        'https://json-schema.org/draft/2020-12/schema'
      );
      expect(reconsiderTool.examples).toHaveLength(4);
    });

    it('should include examples with correct structure', async () => {
      const tools = await getTools();

      tools.forEach((tool) => {
        tool.examples.forEach((example) => {
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
      expect(zodToJsonSchema).toHaveBeenCalledWith(ReconsiderInputSchema);
      expect(zodToJsonSchema).toHaveBeenCalledTimes(2);
    });

    it('should have specific example scenarios', async () => {
      const tools = await getTools();

      // Experience tool examples
      const experienceTool = tools.find((t) => t.name === 'experience');
      const expExampleIds = experienceTool.examples.map((e) => e.id);
      expect(expExampleIds).toContain('human-emotional-experience');
      expect(expExampleIds).toContain('ai-extended-perception');
      expect(expExampleIds).toContain('pattern-realization');
      expect(expExampleIds).toContain('integrated-recall-search');
      expect(expExampleIds).toContain('reasoning-chain-next-moment');
      expect(expExampleIds).toContain('context-for-atomicity');
      expect(expExampleIds).toContain('batch-complementary-capture');
      expect(expExampleIds).toContain('mixed-qualities-true');

      // Reconsider tool examples
      const reconsiderTool = tools.find((t) => t.name === 'reconsider');
      const reconsiderExampleIds = reconsiderTool.examples.map((e) => e.id);
      expect(reconsiderExampleIds).toContain('deepen-understanding');
      expect(reconsiderExampleIds).toContain('perspective-shift');
      expect(reconsiderExampleIds).toContain('release-single');
      expect(reconsiderExampleIds).toContain('mixed-operations');
    });

    it('should have consistent tool structure', async () => {
      const tools = await getTools();

      tools.forEach((tool) => {
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
    it('should add $schema property to reconsider tool', async () => {
      const tools = await getTools();

      const reconsiderTool = tools.find((t) => t.name === 'reconsider');
      expect(reconsiderTool.inputSchema.$schema).toBe(
        'https://json-schema.org/draft/2020-12/schema'
      );
    });

    it('should not add $schema property to experience tool', async () => {
      const tools = await getTools();

      const experienceTool = tools.find((t) => t.name === 'experience');
      expect(experienceTool.inputSchema.$schema).toBeUndefined();
    });
  });
});
