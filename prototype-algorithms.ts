#!/usr/bin/env tsx

/**
 * Prototype: Bridge Semantic Coordinate Algorithms
 * 
 * This script tests different clustering and analysis algorithms
 * for the semantic coordinate system.
 */

// ============================================================================
// ALGORITHM PROTOTYPES
// ============================================================================

interface Experience {
  id: string;
  source: string;
  experiencer: string;
  experience: string[];
  coordinates: Record<string, number>;
  reflects?: string[];
  created: string;
}

// ============================================================================
// CLUSTERING ALGORITHMS
// ============================================================================

/**
 * K-means clustering for coordinate space
 */
function kMeansClustering(experiences: Experience[], k: number, dimensions: string[]): any {
  if (experiences.length < k) {
    return { clusters: experiences.map(exp => [exp]), centroids: [] };
  }
  
  // Initialize centroids randomly
  const centroids: Record<string, number>[] = [];
  for (let i = 0; i < k; i++) {
    const randomExp = experiences[Math.floor(Math.random() * experiences.length)];
    const centroid: Record<string, number> = {};
    for (const dim of dimensions) {
      centroid[dim] = randomExp.coordinates[dim] || 0.5;
    }
    centroids.push(centroid);
  }
  
  // Iterate until convergence
  let iterations = 0;
  const maxIterations = 100;
  let converged = false;
  
  while (!converged && iterations < maxIterations) {
    iterations++;
    
    // Assign experiences to nearest centroid
    const clusters: Experience[][] = Array.from({ length: k }, () => []);
    
    for (const exp of experiences) {
      let minDistance = Infinity;
      let nearestCentroid = 0;
      
      for (let i = 0; i < k; i++) {
        const distance = euclideanDistance(exp.coordinates, centroids[i], dimensions);
        if (distance < minDistance) {
          minDistance = distance;
          nearestCentroid = i;
        }
      }
      
      clusters[nearestCentroid].push(exp);
    }
    
    // Update centroids
    const newCentroids: Record<string, number>[] = [];
    let totalMovement = 0;
    
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) {
        // Empty cluster - reinitialize randomly
        const randomExp = experiences[Math.floor(Math.random() * experiences.length)];
        const centroid: Record<string, number> = {};
        for (const dim of dimensions) {
          centroid[dim] = randomExp.coordinates[dim] || 0.5;
        }
        newCentroids.push(centroid);
        totalMovement += 1;
      } else {
        // Calculate new centroid
        const centroid: Record<string, number> = {};
        for (const dim of dimensions) {
          const sum = clusters[i].reduce((acc, exp) => acc + (exp.coordinates[dim] || 0), 0);
          centroid[dim] = sum / clusters[i].length;
        }
        newCentroids.push(centroid);
        
        // Calculate movement
        totalMovement += euclideanDistance(centroids[i], centroid, dimensions);
      }
    }
    
    centroids.splice(0, centroids.length, ...newCentroids);
    
    // Check convergence
    converged = totalMovement < 0.01;
  }
  
  // Reconstruct clusters for return
  const finalClusters: Experience[][] = Array.from({ length: k }, () => []);
  for (const exp of experiences) {
    let minDistance = Infinity;
    let nearestCentroid = 0;
    
    for (let i = 0; i < k; i++) {
      const distance = euclideanDistance(exp.coordinates, centroids[i], dimensions);
      if (distance < minDistance) {
        minDistance = distance;
        nearestCentroid = i;
      }
    }
    
    finalClusters[nearestCentroid].push(exp);
  }
  
  return {
    clusters: finalClusters.map((cluster, i) => ({
      id: `cluster_${i}`,
      experiences: cluster,
      centroid: centroids[i],
      size: cluster.length
    })),
    iterations,
    converged
  };
}

/**
 * Hierarchical clustering using single linkage
 */
function hierarchicalClustering(experiences: Experience[], dimensions: string[], threshold: number = 0.3): any {
  if (experiences.length <= 1) {
    return { clusters: experiences.length === 1 ? [{ id: 'cluster_0', experiences, centroid: experiences[0].coordinates }] : [] };
  }
  
  // Initialize each experience as its own cluster
  let clusters: Array<{ id: string; experiences: Experience[]; centroid: Record<string, number> }> = 
    experiences.map((exp, i) => ({
      id: `cluster_${i}`,
      experiences: [exp],
      centroid: exp.coordinates
    }));
  
  // Merge clusters until threshold is reached
  while (clusters.length > 1) {
    let minDistance = Infinity;
    let mergeIndex1 = -1;
    let mergeIndex2 = -1;
    
    // Find closest pair of clusters
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const distance = euclideanDistance(clusters[i].centroid, clusters[j].centroid, dimensions);
        if (distance < minDistance) {
          minDistance = distance;
          mergeIndex1 = i;
          mergeIndex2 = j;
        }
      }
    }
    
    // Stop if closest distance exceeds threshold
    if (minDistance > threshold) {
      break;
    }
    
    // Merge clusters
    const cluster1 = clusters[mergeIndex1];
    const cluster2 = clusters[mergeIndex2];
    
    const mergedExperiences = [...cluster1.experiences, ...cluster2.experiences];
    const mergedCentroid: Record<string, number> = {};
    
    for (const dim of dimensions) {
      const sum = mergedExperiences.reduce((acc, exp) => acc + (exp.coordinates[dim] || 0), 0);
      mergedCentroid[dim] = sum / mergedExperiences.length;
    }
    
    const mergedCluster = {
      id: `cluster_${cluster1.id}_${cluster2.id}`,
      experiences: mergedExperiences,
      centroid: mergedCentroid
    };
    
    // Remove old clusters and add merged cluster
    clusters.splice(Math.max(mergeIndex1, mergeIndex2), 1);
    clusters.splice(Math.min(mergeIndex1, mergeIndex2), 1);
    clusters.push(mergedCluster);
  }
  
  return {
    clusters: clusters.map((cluster, i) => ({
      ...cluster,
      id: `cluster_${i}`,
      size: cluster.experiences.length
    }))
  };
}

/**
 * Density-based clustering (DBSCAN-like)
 */
function densityBasedClustering(experiences: Experience[], dimensions: string[], eps: number = 0.3, minPts: number = 2): any {
  const visited = new Set<string>();
  const clusters: Experience[][] = [];
  
  for (const exp of experiences) {
    if (visited.has(exp.id)) continue;
    
    visited.add(exp.id);
    const neighbors = findNeighbors(exp, experiences, dimensions, eps);
    
    if (neighbors.length < minPts) {
      // Noise point - skip
      continue;
    }
    
    // Start new cluster
    const cluster = [exp];
    
    // Expand cluster
    const seedSet = [...neighbors];
    for (const neighbor of seedSet) {
      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        cluster.push(neighbor);
        
        const neighborNeighbors = findNeighbors(neighbor, experiences, dimensions, eps);
        if (neighborNeighbors.length >= minPts) {
          seedSet.push(...neighborNeighbors.filter(n => !visited.has(n.id)));
        }
      }
    }
    
    clusters.push(cluster);
  }
  
  return {
    clusters: clusters.map((cluster, i) => ({
      id: `cluster_${i}`,
      experiences: cluster,
      centroid: calculateCentroid(cluster, dimensions),
      size: cluster.length
    }))
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function euclideanDistance(coords1: Record<string, number>, coords2: Record<string, number>, dimensions: string[]): number {
  let sum = 0;
  for (const dim of dimensions) {
    const val1 = coords1[dim] || 0;
    const val2 = coords2[dim] || 0;
    sum += Math.pow(val1 - val2, 2);
  }
  return Math.sqrt(sum);
}

function findNeighbors(exp: Experience, experiences: Experience[], dimensions: string[], eps: number): Experience[] {
  return experiences.filter(other => 
    other.id !== exp.id && 
    euclideanDistance(exp.coordinates, other.coordinates, dimensions) <= eps
  );
}

function calculateCentroid(experiences: Experience[], dimensions: string[]): Record<string, number> {
  const centroid: Record<string, number> = {};
  for (const dim of dimensions) {
    const sum = experiences.reduce((acc, exp) => acc + (exp.coordinates[dim] || 0), 0);
    centroid[dim] = sum / experiences.length;
  }
  return centroid;
}

// ============================================================================
// PATTERN ANALYSIS
// ============================================================================

/**
 * Analyze patterns across dimensions
 */
function analyzePatterns(experiences: Experience[], dimensions: string[]): any {
  const patterns: Record<string, any> = {};
  
  // Single dimension patterns
  for (const dim of dimensions) {
    const values = experiences.map(exp => exp.coordinates[dim] || 0);
    patterns[dim] = {
      mean: values.reduce((sum, val) => sum + val, 0) / values.length,
      std: Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - patterns[dim]?.mean || 0, 2), 0) / values.length),
      min: Math.min(...values),
      max: Math.max(...values),
      distribution: analyzeDistribution(values)
    };
  }
  
  // Correlation patterns
  patterns.correlations = {};
  for (let i = 0; i < dimensions.length; i++) {
    for (let j = i + 1; j < dimensions.length; j++) {
      const dim1 = dimensions[i];
      const dim2 = dimensions[j];
      const correlation = calculateCorrelation(experiences, dim1, dim2);
      patterns.correlations[`${dim1}_${dim2}`] = correlation;
    }
  }
  
  return patterns;
}

function analyzeDistribution(values: number[]): Record<string, number> {
  const sorted = values.sort((a, b) => a - b);
  const n = sorted.length;
  
  return {
    q25: sorted[Math.floor(n * 0.25)],
    q50: sorted[Math.floor(n * 0.5)],
    q75: sorted[Math.floor(n * 0.75)],
    iqr: sorted[Math.floor(n * 0.75)] - sorted[Math.floor(n * 0.25)]
  };
}

function calculateCorrelation(experiences: Experience[], dim1: string, dim2: string): number {
  const values = experiences.map(exp => ({
    x: exp.coordinates[dim1] || 0,
    y: exp.coordinates[dim2] || 0
  }));
  
  const n = values.length;
  if (n < 2) return 0;
  
  const sumX = values.reduce((sum, v) => sum + v.x, 0);
  const sumY = values.reduce((sum, v) => sum + v.y, 0);
  const sumXY = values.reduce((sum, v) => sum + v.x * v.y, 0);
  const sumX2 = values.reduce((sum, v) => sum + v.x * v.x, 0);
  const sumY2 = values.reduce((sum, v) => sum + v.y * v.y, 0);
  
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
  
  return denominator === 0 ? 0 : numerator / denominator;
}

// ============================================================================
// SYNTHETIC DATA
// ============================================================================

function generateSyntheticData(): Experience[] {
  return [
    // Work experiences
    { id: 'exp_001', source: 'Deep focus coding session', experiencer: 'Human', experience: ['mental embodiment', 'directed purpose'], coordinates: { embodied: 0.1, purpose: 0.1 }, created: '2024-01-15T10:00:00Z' },
    { id: 'exp_002', source: 'Team brainstorming meeting', experiencer: 'Human', experience: ['collective others', 'exploratory purpose'], coordinates: { others: 0.9, purpose: 0.9 }, created: '2024-01-15T14:00:00Z' },
    { id: 'exp_003', source: 'Presenting to stakeholders', experiencer: 'Human', experience: ['felt embodiment', 'directed purpose', 'anticipatory time'], coordinates: { embodied: 0.8, purpose: 0.2, time: 0.8 }, created: '2024-01-16T09:00:00Z' },
    
    // Creative experiences
    { id: 'exp_004', source: 'Painting in the studio', experiencer: 'Human', experience: ['felt embodiment', 'exploratory purpose', 'receptive mood'], coordinates: { embodied: 0.9, purpose: 0.8, mood: 0.8 }, created: '2024-01-16T16:00:00Z' },
    { id: 'exp_005', source: 'Writing breakthrough moment', experiencer: 'Human', experience: ['mental embodiment', 'directed purpose', 'receptive mood'], coordinates: { embodied: 0.2, purpose: 0.1, mood: 0.9 }, created: '2024-01-17T11:00:00Z' },
    
    // Social experiences
    { id: 'exp_006', source: 'Intimate conversation with friend', experiencer: 'Human', experience: ['felt embodiment', 'collective others', 'receptive mood'], coordinates: { embodied: 0.7, others: 0.8, mood: 0.9 }, created: '2024-01-17T19:00:00Z' },
    { id: 'exp_007', source: 'Group dinner celebration', experiencer: 'Human', experience: ['collective others', 'receptive mood', 'historical time'], coordinates: { others: 0.9, mood: 0.8, time: 0.2 }, created: '2024-01-18T20:00:00Z' },
    
    // Physical experiences
    { id: 'exp_008', source: 'Morning yoga practice', experiencer: 'Human', experience: ['felt embodiment', 'immediate space', 'receptive mood'], coordinates: { embodied: 0.9, space: 0.1, mood: 0.7 }, created: '2024-01-19T07:00:00Z' },
    { id: 'exp_009', source: 'Running in the park', experiencer: 'Human', experience: ['felt embodiment', 'exploratory purpose', 'immediate space'], coordinates: { embodied: 0.8, purpose: 0.7, space: 0.2 }, created: '2024-01-19T17:00:00Z' },
    
    // Reflective experiences
    { id: 'exp_010', source: 'Journaling about the week', experiencer: 'Human', experience: ['mental embodiment', 'historical time', 'individual others'], coordinates: { embodied: 0.1, time: 0.1, others: 0.1 }, created: '2024-01-20T09:00:00Z' },
    { id: 'exp_011', source: 'Planning next month goals', experiencer: 'Human', experience: ['mental embodiment', 'anticipatory time', 'directed purpose'], coordinates: { embodied: 0.2, time: 0.9, purpose: 0.1 }, created: '2024-01-20T15:00:00Z' }
  ];
}

// ============================================================================
// MAIN PROTOTYPE
// ============================================================================

async function runAlgorithmPrototype() {
  console.log('🧪 Bridge Semantic Coordinate Algorithms Prototype\n');
  
  // Generate synthetic data
  const experiences = generateSyntheticData();
  console.log(`📊 Generated ${experiences.length} synthetic experiences\n`);
  
  const dimensions = ['embodied', 'purpose', 'mood', 'others', 'time', 'space'];
  
  // Test different clustering algorithms
  console.log('🔍 Clustering Algorithm Comparison:\n');
  
  // K-means clustering
  console.log('📈 K-means Clustering (k=3):');
  const kmeans = kMeansClustering(experiences, 3, dimensions);
  console.log(JSON.stringify(kmeans, null, 2));
  console.log('');
  
  // Hierarchical clustering
  console.log('🌳 Hierarchical Clustering (threshold=0.3):');
  const hierarchical = hierarchicalClustering(experiences, dimensions, 0.3);
  console.log(JSON.stringify(hierarchical, null, 2));
  console.log('');
  
  // Density-based clustering
  console.log('🌊 Density-based Clustering (eps=0.3, minPts=2):');
  const density = densityBasedClustering(experiences, dimensions, 0.3, 2);
  console.log(JSON.stringify(density, null, 2));
  console.log('');
  
  // Pattern analysis
  console.log('📊 Pattern Analysis:');
  const patterns = analyzePatterns(experiences, dimensions);
  console.log(JSON.stringify(patterns, null, 2));
  console.log('');
  
  // Algorithm comparison
  console.log('⚖️ Algorithm Comparison:');
  console.log(`K-means: ${kmeans.clusters.length} clusters, ${kmeans.iterations} iterations`);
  console.log(`Hierarchical: ${hierarchical.clusters.length} clusters`);
  console.log(`Density-based: ${density.clusters.length} clusters`);
  console.log('');
  
  // Show cluster contents
  console.log('📋 Cluster Contents:');
  console.log('\nK-means Clusters:');
  kmeans.clusters.forEach((cluster, i) => {
    console.log(`Cluster ${i}: ${cluster.experiences.map(exp => exp.id).join(', ')}`);
  });
  
  console.log('\nHierarchical Clusters:');
  hierarchical.clusters.forEach((cluster, i) => {
    console.log(`Cluster ${i}: ${cluster.experiences.map(exp => exp.id).join(', ')}`);
  });
  
  console.log('\nDensity-based Clusters:');
  density.clusters.forEach((cluster, i) => {
    console.log(`Cluster ${i}: ${cluster.experiences.map(exp => exp.id).join(', ')}`);
  });
}

// Run the prototype
runAlgorithmPrototype().catch(console.error); 