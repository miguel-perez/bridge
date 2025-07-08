import { z } from 'zod';
import { generateId, saveSource } from '../core/storage.js';
import type { SourceRecord, ProcessingLevel } from '../core/types.js';
import { validateFlexibleDate } from '../utils/validation.js';

// Capture input schema
export const captureSchema = z.object({
  content: z.string().optional(), // Make content optional to allow file auto-read
  contentType: z.string().optional().default('text'),
  perspective: z.enum(['I', 'we', 'you', 'they']),
  processing: z.enum(['during', 'right-after', 'long-after', 'crafted']),
  when: z.string().optional(),
  experiencer: z.string(),
  reflects_on: z.array(z.string()).optional(),
  file: z.string().optional(),
}).refine((data) => {
  // Ensure either content or file is provided
  if (!data.content && !data.file) {
    throw new Error('Either content or file must be provided');
  }
  return true;
}, {
  message: 'Either content or file must be provided'
});

export interface CaptureInput {
  content?: string;
  contentType?: string;
  perspective: 'I' | 'we' | 'you' | 'they';
  processing: 'during' | 'right-after' | 'long-after' | 'crafted';
  when?: string;
  experiencer: string;
  reflects_on?: string[];
  file?: string;
}

export interface CaptureResult {
  source: SourceRecord;
  defaultsUsed: string[];
}

export class CaptureService {
  async captureSource(input: CaptureInput): Promise<CaptureResult> {
    // Validate when field with flexible date parsing
    if (input.when && !(await validateFlexibleDate(input.when))) {
      throw new Error(`Invalid date format for 'when': ${input.when}. Use natural language like 'yesterday', 'last week', '2024-01-15', or ISO 8601 format.`);
    }

    // For file captures, read file contents if no content provided
    if (input.file) {
      return this.captureFromFile(input);
    }

    // Create source record for non-file captures
    if (!input.content) {
      throw new Error('Content is required when no file is provided');
    }
    
    const source = await saveSource({
      id: generateId('src'),
      content: input.content,
      contentType: input.contentType || 'text',
      created: new Date().toISOString(),
      when: input.when,
      perspective: input.perspective,
      experiencer: input.experiencer,
      processing: input.processing as ProcessingLevel,
      reflects_on: input.reflects_on,
    });

    const defaultsUsed = this.getDefaultsUsed(input);
    return { source, defaultsUsed };
  }

  async captureFromFile(input: CaptureInput): Promise<CaptureResult> {
    let fileContent = input.content;
    
    // If no content provided, read from file
    if (!fileContent || fileContent.trim() === '') {
      const fs = await import('fs/promises');
      
      // Validate file exists and is readable
      try {
        await fs.access(input.file!);
      } catch (error) {
        throw new Error(`File not found or not accessible: ${input.file}`);
      }
      
      // Read file contents
      fileContent = await fs.readFile(input.file!, 'utf8');
      
      if (!fileContent || fileContent.trim() === '') {
        throw new Error(`File is empty: ${input.file}`);
      }
    }
    
    // Create source record with file metadata
    const source = await saveSource({
      id: generateId('src'),
      content: fileContent,
      contentType: input.contentType || 'text',
      created: new Date().toISOString(),
      when: input.when,
      perspective: input.perspective,
      experiencer: input.experiencer,
      processing: input.processing as ProcessingLevel,
      reflects_on: input.reflects_on,
      ...(input.file && { file: input.file }),
    });

    const defaultsUsed = this.getDefaultsUsed(input);
    return { source, defaultsUsed };
  }

  private getDefaultsUsed(input: CaptureInput): string[] {
    const defaultsUsed = [];
    if (!input.perspective) defaultsUsed.push('perspective="I"');
    if (!input.experiencer) defaultsUsed.push('experiencer="self"');
    if (!input.processing) defaultsUsed.push('processing="during"');
    return defaultsUsed;
  }
} 