/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1, where:
 * - 1 means identical vectors
 * - 0 means orthogonal (unrelated)
 * - -1 means opposite vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector dimensions must match: ${a.length} !== ${b.length}`
    );
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    magnitudeA += a[i] * a[i];
    magnitudeB += b[i] * b[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Find top-K most similar vectors to a query vector
 */
export function findTopSimilar(
  query: number[],
  vectors: { id: string; vector: number[]; data?: unknown }[],
  topK: number
): Array<{ id: string; similarity: number; data?: unknown }> {
  // Calculate similarities
  const similarities = vectors.map((item) => ({
    id: item.id,
    similarity: cosineSimilarity(query, item.vector),
    data: item.data,
  }));

  // Sort by similarity (descending)
  similarities.sort((a, b) => b.similarity - a.similarity);

  // Return top-K
  return similarities.slice(0, topK);
}

/**
 * Normalize a vector to unit length
 */
export function normalizeVector(vector: number[]): number[] {
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

  if (magnitude === 0) {
    return vector;
  }

  return vector.map((val) => val / magnitude);
}

/**
 * Calculate Euclidean distance between two vectors
 */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(
      `Vector dimensions must match: ${a.length} !== ${b.length}`
    );
  }

  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}
