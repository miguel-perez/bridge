/**
 * Simple session-based call counter for tracking "still thinking" flow
 * Inspired by sequential thinking's minimal pattern
 */

let sessionCallCount = 0;

/**
 * Increments the session call count and returns the new value
 * @returns The incremented call count
 */
export function incrementCallCount(): number {
  return ++sessionCallCount;
}

/**
 * Resets the session call count to zero
 */
export function resetCallCount(): void {
  sessionCallCount = 0;
}

/**
 * Gets the current session call count
 * @returns The current call count
 */
export function getCallCount(): number {
  return sessionCallCount;
}
