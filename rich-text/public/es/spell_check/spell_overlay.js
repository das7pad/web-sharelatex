export default function makeSpellOverlay (wordManager) {
  return {
    token (stream) {
      const { line: currentLine } = stream.lineOracle
      const highlightsForLine = wordManager.getHighlights()[currentLine]

      if (highlightsForLine && highlightsForLine.length) {
        for (let highlight of highlightsForLine) {
          if (stream.match(highlight.word)) {
            return 'spell-error'
          }
        }
      }

      stream.next()
      return null
    }
  }
}
