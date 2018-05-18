/* global _ */

export default class HighlightedWordManager {
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

  removeHighlight (highlight) {
    highlight.marker.clear()
    this.highlights = this.highlights.filter((hl) => hl !== highlight)
  }

  findHighlightAtPosition (position) {
    return _.find(this.highlights, ({ marker }) => {
      const markerPos = marker.find()
      return (
        markerPos &&
        markerPos.from.line === position.line &&
        markerPos.to.line === position.line &&
        markerPos.from.ch <= position.ch &&
        markerPos.to.ch >= position.ch
      )
    })
  }

  clearHighlightTouchingRange (e) {
    const highlight = _.find(this.highlights, (hl) => {
      return this.isHighlightTouchingSelection(hl, e.from, e.to)
    })

    if (highlight) {
      this.removeHighlight(highlight)
    }
  }

  isHighlightTouchingSelection (highlight, selectionFrom, selectionTo) {
    const { from: highlightFrom, to: highlightTo } = highlight.marker.find()

    const onSameLine = highlightFrom.line === selectionFrom.line
    const selectionFromIsWithinHighlight = (
      highlightFrom.ch <= selectionFrom.ch &&
      highlightTo.ch >= selectionFrom.ch
    )
    const selectionToIsWithinHighlight = (
      highlightFrom.ch <= selectionTo.ch &&
      highlightTo.ch >= selectionTo.ch
    )

    return (
      onSameLine &&
      (selectionFromIsWithinHighlight || selectionToIsWithinHighlight)
    )
  }
}
