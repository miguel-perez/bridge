/**
 * Flow state messages for stillThinking acknowledgment
 *
 * Provides contextual messages about flow state to give explicit
 * permission and acknowledgment for continued tool calls.
 */

/**
 * Generates a flow state message based on stillThinking status
 * @param stillThinking - Whether more tool calls are expected
 * @param callsSoFar - Number of calls made so far
 * @returns Formatted flow state message
 */
export function getFlowStateMessage(stillThinking: boolean, callsSoFar: number): string {
  if (stillThinking) {
    const messages = [
      `🤔 Still thinking... (${callsSoFar} ${callsSoFar === 1 ? 'step' : 'steps'} so far)`,
      `Continue exploring - I'm tracking your progress.`,
      `Permission granted for more tool calls.`,
    ];
    return messages.join('\n');
  } else {
    const messages = [
      `✅ Flow complete! (${callsSoFar} total ${callsSoFar === 1 ? 'step' : 'steps'})`,
      `Investigation concluded.`,
      callsSoFar > 1 ? `Great ${getFlowType(callsSoFar)}!` : '',
    ].filter(Boolean);
    return messages.join('\n');
  }
}

/**
 * Gets a contextual description of the flow type based on steps
 * @param steps - Number of steps taken
 * @returns Description of the flow type
 */
function getFlowType(steps: number): string {
  if (steps <= 2) return 'exploration';
  if (steps <= 4) return 'investigation';
  if (steps <= 6) return 'deep dive';
  return 'comprehensive analysis';
}

/**
 * Generates a brief inline flow indicator
 * @param stillThinking - Whether more tool calls are expected
 * @param callsSoFar - Number of calls made so far
 * @returns Brief flow indicator
 */
export function getFlowIndicator(stillThinking: boolean, callsSoFar: number): string {
  return stillThinking
    ? `[→ Step ${callsSoFar}, continuing...]`
    : `[✓ Step ${callsSoFar}, complete]`;
}
