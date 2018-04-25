export default class WordManager {
  constructor (editor) {
    this.editor = editor
    this.reset()
  }

  reset () {
    this.highlights = []
  }

  getHighlights () {
    return this.highlights
  }

  clearRows (from = 0, to = this.highlights.length - 1) {
    this.highlights.splice(from, to - from + 1)
  }

  addHighlight (highlight) {
    const lineNo = highlight.row
    const line = this.highlights[lineNo] || []
    this.highlights[lineNo] = line.concat(highlight)
  }
}
