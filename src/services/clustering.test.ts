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
    it('should cluster experiences by dimensional similarity', async () => {
      const clusters = await clusterExperiences(mockExperiences);
      
      expect(clusters).toBeDefined();
      expect(Array.isArray(clusters)).toBe(true);
      expect(clusters.length).toBeGreaterThan(0);
      
      // Should have at least one cluster with multiple experiences
      const multiExperienceClusters = clusters.filter(cluster => cluster.experienceIds.length > 1);
      expect(multiExperienceClusters.length).toBeGreaterThan(0);
    });

    it('should group experiences with similar dimensional signatures', async () => {
      const clusters = await clusterExperiences(mockExperiences);
      
      // Find the anxiety cluster (exp-1 and exp-2 should be together)
      const anxietyCluster = clusters.find(cluster => 
        cluster.experienceIds.includes('exp-1') && cluster.experienceIds.includes('exp-2')
      );
      
      expect(anxietyCluster).toBeDefined();
      expect(anxietyCluster?.experienceIds).toContain('exp-1');
      expect(anxietyCluster?.experienceIds).toContain('exp-2');
      expect(anxietyCluster?.summary).toContain('anxious');
    });

    it('should generate meaningful cluster summaries', async () => {
      const clusters = await clusterExperiences(mockExperiences);
      
      clusters.forEach(cluster => {
        expect(cluster.summary).toBeDefined();
        expect(typeof cluster.summary).toBe('string');
        expect(cluster.summary.length).toBeGreaterThan(0);
        expect(cluster.experienceIds.length).toBeGreaterThan(0);
      });
    });

    it('should handle single experiences as individual clusters', async () => {
      const singleExperience = [mockExperiences[0]];
      const clusters = await clusterExperiences(singleExperience);
      
      expect(clusters.length).toBe(1);
      expect(clusters[0].experienceIds).toEqual(['exp-1']);
      expect(clusters[0].summary).toBeDefined();
    });

    it('should handle empty experience list', async () => {
      const clusters = await clusterExperiences([]);
      
      expect(clusters).toEqual([]);
    });

    it('should handle experiences without dimensional signatures', async () => {
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
      const clusters = await clusterExperiences(mockExperiences);
      
      clusters.forEach(cluster => {
        expect(cluster).toHaveProperty('id');
        expect(cluster).toHaveProperty('summary');
        expect(cluster).toHaveProperty('experienceIds');
        expect(cluster).toHaveProperty('commonDimensions');
        expect(cluster).toHaveProperty('size');
        
        expect(typeof cluster.id).toBe('string');
        expect(typeof cluster.summary).toBe('string');
        expect(Array.isArray(cluster.experienceIds)).toBe(true);
        expect(Array.isArray(cluster.commonDimensions)).toBe(true);
        expect(typeof cluster.size).toBe('number');
        expect(cluster.size).toBe(cluster.experienceIds.length);
      });
    });
  });
}); 