/**
 * Safely focus the CodeMirror instance
 *
 * @param {CodeMirror} cm
 */
export function focus(cm) {
  // Can get errors due to popup blockers
  try {
    cm.focus()
  } catch (e) {
    // Ignore
  }
}
