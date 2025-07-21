import { SourceRecord } from '../core/types.js';
import { clusterExperiences } from './clustering.js';

describe('Clustering Service', () => {
  const mockExperiences: SourceRecord[] = [
    {
      id: 'exp-1',
      source: 'I feel anxious about the presentation tomorrow',
      created: '2025-01-20T10:00:00Z',
      experience: ['embodied.sensing', 'mood.closed', 'time.future']
    },
    {
      id: 'exp-2', 
      source: 'I feel anxious about the meeting next week',
      created: '2025-01-20T11:00:00Z',
      experience: ['embodied.sensing', 'mood.closed', 'time.future']
    },
    {
      id: 'exp-3',
      source: 'I feel excited and energized about this project',
      created: '2025-01-20T12:00:00Z',
      experience: ['embodied.sensing', 'mood.open', 'purpose.goal']
    },
    {
      id: 'exp-4',
      source: 'I feel focused and determined to solve this problem',
      created: '2025-01-20T13:00:00Z',
      experience: ['embodied.thinking', 'focus.narrow', 'purpose.goal']
    },
    {
      id: 'exp-5',
      source: 'I feel overwhelmed by all the tasks',
      created: '2025-01-20T14:00:00Z',
      experience: ['embodied.sensing', 'mood.closed', 'focus.broad']
    }
  ];

  describe('clusterExperiences', () => {
    it('should cluster experiences by quality similarity', async () => {
      const clusters = await clusterExperiences(mockExperiences);
      
      expect(clusters).toBeDefined();
      expect(Array.isArray(clusters)).toBe(true);
      expect(clusters.length).toBeGreaterThan(0);
      
      // Should have at least one cluster with multiple experiences
      const multiExperienceClusters = clusters.filter(cluster => cluster.experienceIds.length > 1);
      expect(multiExperienceClusters.length).toBeGreaterThan(0);
    });

    it('should group experiences with similar quality signatures', async () => {
      const experiences = [
        {
          id: 'exp-1',
          source: 'I feel anxious about the presentation',
          experience: ['embodied.sensing', 'mood.closed', 'time.future'],
          created: '2025-01-21T10:00:00Z'
        },
        {
          id: 'exp-2',
          source: 'I feel nervous about the meeting',
          experience: ['embodied.sensing', 'mood.closed', 'time.future'],
          created: '2025-01-21T11:00:00Z'
        },
        {
          id: 'exp-3',
          source: 'I feel excited about the project',
          experience: ['mood.open', 'purpose.goal'],
          created: '2025-01-21T12:00:00Z'
        }
      ];

      const clusters = await clusterExperiences(experiences);

      expect(clusters).toHaveLength(2);
      
      const anxietyCluster = clusters.find(c => c.size === 2);
      expect(anxietyCluster).toBeDefined();
      expect(anxietyCluster?.experienceIds).toContain('exp-1');
      expect(anxietyCluster?.experienceIds).toContain('exp-2');
      expect(anxietyCluster?.summary).toContain('embodied.sensing');
    });

    it('should generate meaningful cluster summaries', async () => {
      const experiences = [
        {
          id: 'exp-1',
          source: 'I feel anxious about the presentation',
          experience: ['embodied.sensing', 'mood.closed', 'time.future'],
          created: '2025-01-21T10:00:00Z'
        },
        {
          id: 'exp-2',
          source: 'I feel nervous about the meeting',
          experience: ['embodied.sensing', 'mood.closed', 'time.future'],
          created: '2025-01-21T11:00:00Z'
        }
      ];

      const clusters = await clusterExperiences(experiences);

      expect(clusters).toHaveLength(1);
      expect(clusters[0].summary).toContain('2 experiences');
      expect(clusters[0].summary).toContain('embodied.sensing');
    });

    it('should handle single experiences', async () => {
      const experiences = [
        {
          id: 'exp-1',
          source: 'I feel anxious about the presentation',
          experience: ['embodied.sensing', 'mood.closed'],
          created: '2025-01-21T10:00:00Z'
        }
      ];

      const clusters = await clusterExperiences(experiences);

      expect(clusters).toHaveLength(1);
      expect(clusters[0].size).toBe(1);
      expect(clusters[0].experienceIds).toContain('exp-1');
    });

    it('should handle empty experience list', async () => {
      const clusters = await clusterExperiences([]);

      expect(clusters).toHaveLength(0);
    });

    it('should handle experiences without quality signatures', async () => {
      const experiencesWithoutDimensions = [
        {
          id: 'exp-6',
          source: 'Just a regular day',
          created: '2025-01-20T15:00:00Z'
        },
        {
          id: 'exp-7',
          source: 'Another regular day',
          created: '2025-01-20T16:00:00Z'
        }
      ];
      
      const clusters = await clusterExperiences(experiencesWithoutDimensions);
      
      expect(clusters).toBeDefined();
      expect(Array.isArray(clusters)).toBe(true);
      // Should still create clusters based on semantic similarity
      expect(clusters.length).toBeGreaterThan(0);
    });

    it('should create clusters with proper structure', async () => {
      const experiences = [
        {
          id: 'exp-1',
          source: 'I feel anxious about the presentation',
          experience: ['embodied.sensing', 'mood.closed', 'time.future'],
          created: '2025-01-21T10:00:00Z'
        },
        {
          id: 'exp-2',
          source: 'I feel nervous about the meeting',
          experience: ['embodied.sensing', 'mood.closed', 'time.future'],
          created: '2025-01-21T11:00:00Z'
        }
      ];

      const clusters = await clusterExperiences(experiences);

      clusters.forEach(cluster => {
        expect(cluster).toHaveProperty('id');
        expect(cluster).toHaveProperty('summary');
        expect(cluster).toHaveProperty('experienceIds');
        expect(cluster).toHaveProperty('commonQualities');
        expect(cluster).toHaveProperty('size');
        
        expect(typeof cluster.id).toBe('string');
        expect(typeof cluster.summary).toBe('string');
        expect(Array.isArray(cluster.experienceIds)).toBe(true);
        expect(Array.isArray(cluster.commonQualities)).toBe(true);
        expect(typeof cluster.size).toBe('number');
      });
    });
  });
}); 