export default class WordManager {
  constructor (editor) {
    this.editor = editor
    this.reset()
  }

  reset () {
    if (this.highlights) this.highlights.forEach(({ marker }) => marker.clear())
    this.highlights = []
  }

  clearRow (lineNo) {
    this.highlights
      .filter(({ marker }) => {
        const pos = marker.find()
        if (!pos) return false
        return pos.from.line === lineNo
      })
      .forEach((highlight) => this.removeHighlight(highlight))
  }

  addHighlight (highlight) {
    const { row: line, column: ch, word, suggestions } = highlight

    const from = { line, ch }
    const to = { line, ch: ch + word.length }
    const marker = this.editor.markText(from, to, {
      className: 'spelling-error'
    })

    this.highlights.push({
      word,
      suggestions,
      marker
    })
  }
}
