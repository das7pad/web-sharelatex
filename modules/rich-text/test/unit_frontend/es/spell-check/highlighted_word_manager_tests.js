/* global sinon */

import HighlightedWordManager from '../../../../public/es/spell_check/highlighted_word_manager'

describe('HighlightedWordManager', function() {
  beforeEach(function() {
    this.editor = {
      markText: sinon.stub().returns({ clear: sinon.stub() })
    }
    this.highlightedWordManager = new HighlightedWordManager(this.editor)
  })

  it('has no highlights after resetting', function() {
    this.highlightedWordManager.addHighlight({
      row: 0,
      column: 0,
      word: 'foo',
      suggestions: ['bar', 'baz']
    })

    this.highlightedWordManager.reset()

    expect(this.highlightedWordManager.highlights).to.be.empty
  })

  it('clearRow removes highlights on the given row', function() {
    this.editor.markText.returns({
      clear: sinon.stub(),
      find: sinon.stub().returns({ from: { line: 0 } })
    })
    this.highlightedWordManager.addHighlight({
      row: 0,
      column: 0,
      word: 'row0',
      suggestions: ['foo']
    })
    // Kind of ugly hack to get second marker to return correct row
    this.editor.markText.returns({
      clear: sinon.stub(),
      find: sinon.stub().returns({ from: { line: 1 } })
    })
    this.highlightedWordManager.addHighlight({
      row: 1,
      column: 0,
      word: 'row1',
      suggestions: ['bar']
    })

    this.highlightedWordManager.clearRow(0)

    expect(this.highlightedWordManager.highlights).to.have.lengthOf(1)
    expect(this.highlightedWordManager.highlights[0].word).to.equal('row1')
  })

  it('addHighlight adds highlight', function() {
    const markerStub = { clear: sinon.stub() }
    this.editor.markText.returns(markerStub)

    this.highlightedWordManager.addHighlight({
      row: 0,
      column: 0,
      word: 'foo',
      suggestions: ['bar', 'baz']
    })

    const highlight = this.highlightedWordManager.highlights[0]
    expect(highlight.marker).to.equal(markerStub)
    expect(highlight.word).to.equal('foo')
    expect(highlight.suggestions).to.deep.equal(['bar', 'baz'])
  })

  it('removeHighlight removes a given highlight', function() {
    this.highlightedWordManager.addHighlight({
      row: 0,
      column: 0,
      word: 'foo',
      suggestions: ['bar', 'baz']
    })

    const highlight = this.highlightedWordManager.highlights[0]
    this.highlightedWordManager.removeHighlight(highlight)

    expect(this.highlightedWordManager.highlights).to.be.empty
  })

  it('removeWord removes highlights for a given word', function() {
    this.highlightedWordManager.addHighlight({
      row: 0,
      column: 0,
      word: 'foo',
      suggestions: ['bar', 'baz']
    })

    this.highlightedWordManager.removeWord('foo')

    expect(this.highlightedWordManager.highlights).to.be.empty
  })

  it('findHighlightAtPosition finds a highlight from a given position', function() {
    this.editor.markText.returns({
      clear: sinon.stub(),
      find: sinon.stub().returns({
        from: { line: 0, ch: 0 },
        to: { line: 0, ch: 3 }
      })
    })
    this.highlightedWordManager.addHighlight({
      row: 0,
      column: 0,
      word: 'foo',
      suggestions: ['bar', 'baz']
    })

    const found = this.highlightedWordManager.findHighlightAtPosition({
      line: 0,
      ch: 1
    })

    expect(found.word).to.equal('foo')
  })

  it('clearHighlightTouchingRange removes highlight where selection range intersects', function() {
    const clear = sinon.stub()
    this.editor.markText.returns({
      clear,
      find: sinon.stub().returns({
        from: { line: 0, ch: 0 },
        to: { line: 0, ch: 3 }
      })
    })
    this.highlightedWordManager.addHighlight({
      row: 0,
      column: 0,
      word: 'foo',
      suggestions: ['bar', 'baz']
    })

    this.highlightedWordManager.clearHighlightTouchingRange({
      // Cursor is at the end of 'foo'
      from: { line: 0, ch: 3 },
      to: { line: 0, ch: 3 }
    })

    expect(clear).to.have.been.called
  })
})
