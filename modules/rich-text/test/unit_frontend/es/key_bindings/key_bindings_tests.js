/* global sinon, _ */

import CodeMirror from 'codemirror'

import fixture from '../../../../../../test/unit_frontend/es/support/fixture'
import { Editor } from '../../../../public/es/index'

const FIXTURE_HTML = `<div class="rich-text">
<link rel="stylesheet" href="base/public/stylesheets/style.css">
<div id="cm"></div>
</div>
`

const autocompleteAdapterStub = {
  getBeginCommandArguments: () => ['environmentName']
}

describe('Key bindings', function() {
  beforeEach(function() {
    const html = fixture.load(FIXTURE_HTML)

    this.getSetting = sinon.stub()
    this.editor = new Editor(
      html.querySelector('#cm'),
      {},
      autocompleteAdapterStub,
      {},
      this.getSetting
    )
    this.editor.enable()
    this.cm = this.editor.getCodeMirror()
  })

  afterEach(function() {
    fixture.cleanUp()
    this.editor.disable()
  })

  /**
   * Pretend we pressed the given key.
   *
   * NB: This only works for CodeMirror's named keys; e.g. you can't type a '{'
   * using this method, but you can type a Backspace. It's also possible to
   * type some characters that aren't mapped as character bindings; e.g. it
   * seems you can use this to fake Backspace. To type a '{', use _fakeExtraKey.
   *
   * Based on CodeMirror's test/emacs_test.js
   */
  function fakeNamedKey(cm, keyName) {
    var ctrl, shift, alt
    var key = keyName.replace(/\w+-/g, function(type) {
      if (type === 'Ctrl-') ctrl = true
      else if (type === 'Alt-') alt = true
      else if (type === 'Shift-') shift = true
      return ''
    })

    var code = null
    for (var c in CodeMirror.keyNames) {
      if (CodeMirror.keyNames[c] === key) {
        code = c
        break
      }
    }

    if (code === null) throw new Error('Unknown key: ' + key)

    cm.triggerOnKeyDown({
      type: 'keydown',
      keyCode: code,
      ctrlKey: ctrl,
      shiftKey: shift,
      altKey: alt,
      preventDefault: function() {},
      stopPropagation: function() {}
    })
  }

  /**
   * Call directly into the extraKeys map that we set.
   *
   * NB this does NOT actually pass the events further up the handler chain,
  so
   * it may not have the full effect on the document; you can however check
   * whether it does pass by checking whether this returns CodeMirror.Pass.
   */
  function fakeExtraKey(cm, key) {
    if (key.length === 1) {
      return cm.getOption('extraKeys')["'" + key + "'"](cm)
    } else {
      return cm.getOption('extraKeys')[key](cm)
    }
  }

  function expectCursorAt(cm, line, ch) {
    // In CodeMirror 5.11, getCursor sometimes returns an object with an xRel
    // property, which we ignore for the purpose of this comparison.
    // In CodeMirror 5.27.4, getCursor is inconsistent in whether it returns a
    // Pos typed object or a plain Object. Therefore we just compare the line
    // and ch values
    var cursor = cm.getCursor()
    expect(cursor.line).to.equal(line)
    expect(cursor.ch).to.equal(ch)
  }

  describe('Auto close braces and quotes', function() {
    beforeEach(function() {
      this.getSetting.withArgs('autoCloseBrackets').returns(true)
    })

    it('works', function() {
      // match braces
      expect(fakeExtraKey(this.cm, '{')).to.be.undefined
      expect(this.cm.getValue()).to.equal('{}')
      expectCursorAt(this.cm, 0, 1)

      // backspace should clear both characters
      fakeNamedKey(this.cm, 'Backspace')
      expect(this.cm.getValue()).to.equal('')
      expectCursorAt(this.cm, 0, 0)

      // match brackets
      expect(fakeExtraKey(this.cm, '[')).to.be.undefined
      expect(this.cm.getValue()).to.equal('[]')
      expectCursorAt(this.cm, 0, 1)

      // backspace should clear both characters
      fakeNamedKey(this.cm, 'Backspace')
      expect(this.cm.getValue()).to.equal('')
      expectCursorAt(this.cm, 0, 0)

      // match single quotes
      expect(fakeExtraKey(this.cm, '`')).to.be.undefined
      expect(this.cm.getValue()).to.equal("`'")
      expectCursorAt(this.cm, 0, 1)

      // backspace should clear both characters
      fakeNamedKey(this.cm, 'Backspace')
      expect(this.cm.getValue()).to.equal('')
      expectCursorAt(this.cm, 0, 0)

      // match double quotes
      expect(fakeExtraKey(this.cm, '`')).to.be.undefined
      expect(this.cm.getValue()).to.equal("`'")
      expectCursorAt(this.cm, 0, 1)
      expect(fakeExtraKey(this.cm, '`')).to.be.undefined
      expect(this.cm.getValue()).to.equal("``''")
      expectCursorAt(this.cm, 0, 2)

      // backspace should clear inner quotes, then outer quotes
      fakeNamedKey(this.cm, 'Backspace')
      expect(this.cm.getValue()).to.equal("`'")
      expectCursorAt(this.cm, 0, 1)
      fakeNamedKey(this.cm, 'Backspace')
      expect(this.cm.getValue()).to.equal('')
      expectCursorAt(this.cm, 0, 0)

      // don't bother matching parentheses any more
      expect(this.cm.getOption('extraKeys')['(']).to.be.undefined
      expect(this.cm.getOption('extraKeys')[')']).to.be.undefined

      // don't insert matching bracket when oppening bracket is just before a
      // string
      this.cm.setValue('xy')
      fakeExtraKey(this.cm, '{')
      expect(this.cm.getValue()).to.equal('{xy')
      fakeExtraKey(this.cm, '[')
      expect(this.cm.getValue()).to.equal('{[xy')
      fakeExtraKey(this.cm, '`')
      expect(this.cm.getValue()).to.equal('{[`xy')

      // don't try to be smart when something is selected
      this.cm.setValue('xy')
      this.cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 2 })
      // all _fakeExtraKey this.cm, should fail writing anything because it
      // should return a CodeMirror.Pass as something is selected
      fakeExtraKey(this.cm, '{')
      fakeExtraKey(this.cm, '}')
      fakeExtraKey(this.cm, '[')
      fakeExtraKey(this.cm, ']')
      fakeExtraKey(this.cm, '`')
      fakeExtraKey(this.cm, "'")
      expect(this.cm.getValue()).to.equal('xy')
    })

    it('works with multiple cursors', function() {
      function expectRangesMatch(expectedRange, actualRange) {
        expect(expectedRange[0].anchor).to.deep.equal(actualRange[0].anchor)
        expect(expectedRange[0].head).to.deep.equal(actualRange[0].head)
        expect(expectedRange[1].anchor).to.deep.equal(actualRange[1].anchor)
        expect(expectedRange[1].head).to.deep.equal(actualRange[1].head)
      }

      const testAutoCloseWithMultipleCursors = (openingChar, closingChar) => {
        // Initialise with 2 empty lines & set cursor on both lines
        this.cm.setValue('\n' + '')
        this.cm.setSelections([
          { anchor: CodeMirror.Pos(0, 0), head: CodeMirror.Pos(0, 0) },
          { anchor: CodeMirror.Pos(1, 0), head: CodeMirror.Pos(1, 0) }
        ])

        // Press opening char key
        fakeExtraKey(this.cm, openingChar)

        // Opening & closing chars to be inserted
        expect(this.cm.getValue()).to.equal(
          openingChar + closingChar + '\n' + openingChar + closingChar
        )
        // Cursor should be inbetween the opening & closing chars
        expectRangesMatch(this.cm.listSelections(), [
          { anchor: CodeMirror.Pos(0, 1), head: CodeMirror.Pos(0, 1) },
          { anchor: CodeMirror.Pos(1, 1), head: CodeMirror.Pos(1, 1) }
        ])

        // Press closing char key
        fakeExtraKey(this.cm, closingChar)

        // Cursor should be after the opening & closing chars
        expectRangesMatch(this.cm.listSelections(), [
          { anchor: CodeMirror.Pos(0, 2), head: CodeMirror.Pos(0, 2) },
          { anchor: CodeMirror.Pos(1, 2), head: CodeMirror.Pos(1, 2) }
        ])

        // Reset the cursors back inbetween the opening & closing chars
        this.cm.setSelections([
          { anchor: CodeMirror.Pos(0, 1), head: CodeMirror.Pos(0, 1) },
          { anchor: CodeMirror.Pos(1, 1), head: CodeMirror.Pos(1, 1) }
        ])

        // Press the Backspace key
        fakeNamedKey(this.cm, 'Backspace')

        // Lines should be empty (closing char is also removed)
        expect(this.cm.getValue()).to.equal('\n' + '')
        // Cursor should be at the SOL
        expectRangesMatch(this.cm.listSelections(), [
          { anchor: CodeMirror.Pos(0, 0), head: CodeMirror.Pos(0, 0) },
          { anchor: CodeMirror.Pos(1, 0), head: CodeMirror.Pos(1, 0) }
        ])
      }

      testAutoCloseWithMultipleCursors('{', '}')
      testAutoCloseWithMultipleCursors('[', ']')
      testAutoCloseWithMultipleCursors('`', "'")
    })
  })

  describe('Enter key', function() {
    it('should add a new item on a list', function() {
      this.cm.setValue(
        '\\begin{enumerate}\n' +
          '\\item FIRST\n' +
          '\\item SECOND\n' +
          '\\begin{enumerate}\n' +
          '\\item FIRST\n' +
          '\\end{enumerate}\n' +
          '\\item THIRD\n' +
          '\\end{enumerate}'
      )
      // Place cursor after nested enumerate env
      // \item FIRST|
      this.cm.setCursor({ line: 4, ch: 11 })

      fakeNamedKey(this.cm, 'Enter')

      var newCursor = this.cm.getCursor()
      expect(newCursor.line).to.equal(5)
      expect(newCursor.ch).to.equal(6)

      // Insert SECOND text on newly created \item
      this.cm.replaceRange('SECOND', newCursor, newCursor)

      var token = this.cm.getTokenAt(this.cm.getCursor(), true)
      var lastClosedMark = _.last(token.state.marks)
      expect(token.string).to.equal('SECOND')
      expect(token.state.openMarks.length).to.equal(2)
      expect(lastClosedMark.checkedProperties.number).to.equal(2)
    })

    it('should move a list to a new line when the cursor is before begin{...}', function() {
      this.cm.setValue(
        '\n\\begin{enumerate}\n' +
          '\\item FIRST\n' +
          '\\item SECOND\n' +
          '\\begin{enumerate}\n' +
          '\\item FIRST\n' +
          '\\end{enumerate}\n' +
          '\\item THIRD\n' +
          '\\end{enumerate}'
      )
      this.cm.setCursor({ line: 0, ch: 0 })

      fakeNamedKey(this.cm, 'Enter')

      var newCursor = this.cm.getCursor()
      expect(newCursor.line).to.equal(1)
      expect(newCursor.ch).to.equal(0)
    })

    it('should remove the last empty item pressing enter two times', function() {
      this.cm.setValue(
        '\\begin{enumerate}\n' +
          '\\item FIRST\n' +
          '\\item SECOND\n' +
          '\\begin{enumerate}\n' +
          '\\item h\n' +
          '\\end{enumerate}\n' +
          '\\item THIRD\n' +
          '\\end{enumerate}'
      )
      // Place cursor after nested enumerate env
      // \end{enumerate}|
      this.cm.setCursor({ line: 6, ch: 14 })

      fakeNamedKey(this.cm, 'Enter')

      var newCursor = this.cm.getCursor()
      expect(newCursor.line).to.equal(7)
      expect(newCursor.ch).to.equal(6)
      expect(this.cm.getLine(7)).to.equal('\\item ')

      fakeNamedKey(this.cm, 'Enter')

      expect(this.cm.getLine(7)).to.equal('\\end{enumerate}')
      expect(this.cm.getLine(8)).to.equal('')
    })

    it('should place the last empty of nested list as item of the outer list', function() {
      this.cm.setValue(
        '\\begin{enumerate}\n' +
          '\\item FIRST\n' +
          '\\item SECOND\n' +
          '\\begin{enumerate}\n' +
          '\\item h\n' +
          '\\end{enumerate}\n' +
          '\\item THIRD\n' +
          '\\end{enumerate}'
      )
      // Place cursor in nested enumerate env
      // \item h|
      this.cm.setCursor({ line: 4, ch: 8 })

      fakeNamedKey(this.cm, 'Enter')

      var newCursor = this.cm.getCursor()
      expect(newCursor.line).to.equal(5)
      expect(newCursor.ch).to.equal(6)
      expect(this.cm.getLine(5)).to.equal('\\item ')

      fakeNamedKey(this.cm, 'Enter')
      expect(this.cm.getLine(5)).to.equal('\\end{enumerate}')
      expect(this.cm.getLine(6)).to.equal('\\item ')
    })

    it('should not insert an item when inside an open mark', function() {
      this.cm.setValue(
        '\\begin{itemize}\n' + '\\item \\textbf{abcabc}\n' + '\\end{itemize}'
      )
      this.cm.setCursor({ line: 1, ch: 16 })

      fakeNamedKey(this.cm, 'Enter')

      expect(this.cm.getLine(1)).to.equal('\\item \\textbf{ab')
      expect(this.cm.getLine(2)).to.equal('cabc}')
    })

    it('should not insert a new item if begin{..} is not alone on the line', function() {
      this.cm.setValue(
        '\\DeclareDocumentCommand\\ben{ O{1.)} }{\\begin{enumerate}[#1]}\n' +
          '\\DeclareDocumentCommand\\ben{ O{1.)} }' +
          '{%\\begin{enumerate}%[#1]}'
      )
      this.cm.setCursor({ line: 0, ch: 60 })

      fakeNamedKey(this.cm, 'Enter')

      expect(this.cm.getLine(1)).to.equal('')
    })
  })

  describe('Up key', function() {
    it('should go up in rich text mode even if there are no marks', function() {
      this.cm.setValue(
        '\\documentclass{minimal}\n' +
          '\\usepackage{pgf}\n' +
          '\\begin{document}\n' +
          'My pgf version is: \\pgfversion\n' +
          '\\end{document}\n'
      )
      this.cm.setCursor({ line: 4, ch: 0 })

      fakeNamedKey(this.cm, 'Up')
      expectCursorAt(this.cm, 3, 0)
      fakeNamedKey(this.cm, 'Up')
      expectCursorAt(this.cm, 2, 0)
      fakeNamedKey(this.cm, 'Up')
      expectCursorAt(this.cm, 1, 0)
      fakeNamedKey(this.cm, 'Up')
      expectCursorAt(this.cm, 0, 0)
    })

    it('should go up a line when inside an empty list', function(done) {
      this.cm.setValue(
        '\n' +
          '\\begin{itemize}\n' +
          '\\item a\n' +
          '\\item b\n' +
          '\\item c\n' +
          '\\end{itemize}'
      )
      // Place cursor after \item c
      // \item c|
      this.cm.setCursor({ line: 4, ch: 7 })

      setTimeout(() => {
        fakeNamedKey(this.cm, 'Up')
        expectCursorAt(this.cm, 3, 7)
        fakeNamedKey(this.cm, 'Up')
        expectCursorAt(this.cm, 2, 7)
        fakeNamedKey(this.cm, 'Up')
        expectCursorAt(this.cm, 0, 0)
        done()
      })
    })
  })

  describe('Backspace key', function() {
    it('should delete the inner environment pressing backspace on the item', function() {
      this.cm.setValue(
        '\\begin{enumerate}\n' +
          '\\item FIRST\n' +
          '\\item SECOND\n' +
          '\\begin{enumerate}\n' +
          '\\item h\n' +
          '\\end{enumerate}\n' +
          '\\item THIRD\n' +
          '\\end{enumerate}'
      )
      this.cm.setCursor({ line: 4, ch: 7 })

      fakeNamedKey(this.cm, 'Backspace')
      expect(this.cm.getLine(4)).to.equal('\\item ')
      fakeNamedKey(this.cm, 'Backspace')
      expect(this.cm.getLine(4)).to.equal('\\item THIRD')
    })

    it('should place the first item before begin pressing backspace', function() {
      this.cm.setValue(
        '\\begin{enumerate}\n' +
          '\\item FIRST\n' +
          '\\item SECOND\n' +
          '\\begin{enumerate}\n' +
          '\\item h\n' +
          '\\end{enumerate}\n' +
          '\\item THIRD\n' +
          '\\end{enumerate}'
      )
      // Place cursor after \item of first item
      // \item |FIRST
      this.cm.setCursor({ line: 1, ch: 6 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(0)).to.equal('FIRST')
    })

    it('should be able to delete a character immediately after a section', function() {
      this.cm.setValue('\\section{foo\n' + '}\n' + 'x')

      var linesBeforeDelete = this.cm.getValue().split('\n')
      expect(linesBeforeDelete).to.deep.equal(['\\section{foo', '}', 'x'])
      // Place cursor after "x"
      // x|
      this.cm.setCursor({ line: 2, ch: 1 })

      fakeNamedKey(this.cm, 'Backspace')

      var linesAfterDelete = this.cm.getValue().split('\n')
      expect(linesAfterDelete).to.deep.equal(['\\section{foo', '}', ''])
    })

    it('should go back one line before section, if that line is blank', function() {
      this.cm.setValue('\n' + '\\section{a}')
      // Place cursor before "a"
      // \section{|a}
      this.cm.setCursor({ line: 1, ch: 9 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(0)).to.equal('\\section{a}')
    })

    it('should place cursor back one line, if the line before is not empty', function() {
      this.cm.setValue('abc\n' + '\\section{a}')
      // Place cursor before "a"
      // \section{|a}
      this.cm.setCursor({ line: 1, ch: 9 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(0)).to.equal('abc')
      expectCursorAt(this.cm, 0, 3)
    })

    it('should place cursor in the section, after pressing backspace at the line after (with contents)', function() {
      this.cm.setValue('abc\n' + '\\section{a}\n' + 'aaa')
      // Place cursor before "aaa"
      // |aaa
      this.cm.setCursor({ line: 2, ch: 0 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('\\section{a}')
      expectCursorAt(this.cm, 1, 10)
    })

    it('should place cursor in the section and remove the ling, after pressing backspace at the line after (without contents)', function() {
      this.cm.setValue('abc\n' + '\\section{a}\n' + 'b\n')
      // Place cursor before "b"
      // |b
      this.cm.setCursor({ line: 2, ch: 0 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('\\section{a}')
      expectCursorAt(this.cm, 1, 10)
      expect(this.cm.getLine(2)).to.equal('b')
    })

    it('should delete an abstract if empty', function() {
      this.cm.setValue('\\begin{abstract}\n' + '\n' + '\\end{abstract}')
      // Place cursor on line between \begin and \end
      this.cm.setCursor({ line: 1, ch: 0 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(0)).to.equal('')
    })

    it('should skip when pressing backspace after an abstract', function() {
      this.cm.setValue(
        '\\begin{abstract}\n' + '\n' + '\\end{abstract}\n' + 'aa'
      )
      // Place cursor before "aa"
      // |aa
      this.cm.setCursor({ line: 3, ch: 0 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(3)).to.equal('aa')
      expectCursorAt(this.cm, 1, 0)
    })

    it('should delete a section command if empty and surrounded by text', function() {
      this.cm.setValue('abc\n' + 'te\\section{}xt\n' + 'b\n')
      // Place cursor within section argument
      // te\section{|}xt
      this.cm.setCursor({ line: 1, ch: 11 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('text')
      expectCursorAt(this.cm, 1, 2)
    })

    it('should not delete the bracket after a section command if empty', function() {
      this.cm.setValue('abc\n' + '\\section{}\n' + 'b\n')
      // Place cursor after section argument
      // \section{}|
      this.cm.setCursor({ line: 1, ch: 10 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('\\section{}')
      expectCursorAt(this.cm, 1, 9)
    })

    it('should delete the text before the section pressing backspace', function() {
      this.cm.setValue('abc\n' + 'tex\\section{section}\n' + 'b\n')
      // Place cursor at beginning of section argument, before "section" text
      // tex\section{|section}
      this.cm.setCursor({ line: 1, ch: 12 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('te\\section{section}')
      expectCursorAt(this.cm, 1, 11)
    })

    it('should delete a section command if empty', function() {
      this.cm.setValue('abc\n' + '\\section{}\n' + 'b\n')
      // Place cursor within section argument
      // \section{|}
      this.cm.setCursor({ line: 1, ch: 9 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('')
      expectCursorAt(this.cm, 1, 0)
    })

    it('should do nothing pressing backspace at the end of a section', function() {
      this.cm.setValue('abc\n' + 'tex\\section{section}abc\n' + 'b\n')
      // Place cursor at end of section argument, after "section" text
      // tex\section{section|}abc
      this.cm.setCursor({ line: 1, ch: 20 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('tex\\section{section}abc')
    })

    it('should delete a subsection command if empty', function() {
      this.cm.setValue('abc\n' + '\\subsection{}\n' + 'b\n')
      // Place cursor inside subsection argument
      // \subsection{|}
      this.cm.setCursor({ line: 1, ch: 12 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('')
      expectCursorAt(this.cm, 1, 0)
    })

    it('should delete a subsection command if empty and surrounded by text', function() {
      this.cm.setValue('abc\n' + 'te\\subsection{}xt\n' + 'b\n')
      // Place cursor inside subsection argument
      // te\subsection{|}xt
      this.cm.setCursor({ line: 1, ch: 14 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('text')
      expectCursorAt(this.cm, 1, 2)
    })

    it('should not delete the bracket after a subsection command if empty', function() {
      this.cm.setValue('abc\n' + '\\subsection{}\n' + 'b\n')
      // Place cursor after subsection argument
      // \subsection{}|
      this.cm.setCursor({ line: 1, ch: 13 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('\\subsection{}')
      expectCursorAt(this.cm, 1, 12)
    })

    it('should delete the text before the subsection pressing backspace', function() {
      this.cm.setValue('abc\n' + 'tex\\subsection{subsection}\n' + 'b\n')
      // Place cursor at start of \subsection argument, before "subsection" text
      // tex\subsection{|subsection}
      this.cm.setCursor({ line: 1, ch: 15 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('te\\subsection{subsection}')
      expectCursorAt(this.cm, 1, 14)
    })

    it('should do nothing pressing backspace at the end of a subsection', function() {
      this.cm.setValue('abc\n' + 'tex\\subsection{subsection}abc\n' + 'b\n')
      // Place cursor at end of subsection argument, after "subsection" text
      // tex\subsection{subsection|}abc
      this.cm.setCursor({ line: 1, ch: 26 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('tex\\subsection{subsection}abc')
    })

    it('should delete a subsubsection command if empty', function() {
      this.cm.setValue('abc\n' + '\\subsubsection{}\n' + 'b\n')
      // Place cursor inside subsubsection argument
      // \subsubsection{|}
      this.cm.setCursor({ line: 1, ch: 15 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('')
      expectCursorAt(this.cm, 1, 0)
    })

    it('should delete a subsubsection command if empty and surrounded by text', function() {
      this.cm.setValue('abc\n' + 'te\\subsubsection{}xt\n' + 'b\n')
      // Place cursor inside subsubsection argument
      // tx\subsubsection{|}
      this.cm.setCursor({ line: 1, ch: 17 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('text')
      expectCursorAt(this.cm, 1, 2)
    })

    it('should not delete the bracket after a subsubsection command if empty', function() {
      this.cm.setValue('abc\n' + '\\subsubsection{}\n' + 'b\n')
      // Place cursor after subsubsection argument
      // \subsubsection{}|
      this.cm.setCursor({ line: 1, ch: 16 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('\\subsubsection{}')
      expectCursorAt(this.cm, 1, 15)
    })

    it('should delete the text before the subsubsection pressing backspace', function() {
      this.cm.setValue('abc\n' + 'tex\\subsubsection{subsubsection}\n' + 'b\n')
      // Place cursor at start of subsubsection argument, before "subsubsection"
      // text
      // tex\subsubsection{|subsubsection}
      this.cm.setCursor({ line: 1, ch: 18 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('te\\subsubsection{subsubsection}')
      expectCursorAt(this.cm, 1, 17)
    })

    it('should do nothing pressing backspace at the end of a subsubsection', function() {
      this.cm.setValue(
        'abc\n' + 'tex\\subsubsection{subsubsection}abc\n' + 'b\n'
      )
      // Place cursor after subsubsection argument, before "abc" text
      // tex\subsubsection{subsubsection}|abc
      this.cm.setCursor({ line: 1, ch: 32 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal(
        'tex\\subsubsection{subsubsection}abc'
      )
    })

    it('should delete a chapter command if empty', function() {
      this.cm.setValue('abc\n' + '\\chapter{}\n' + 'b\n')
      // Place cursor inside chapter argument
      // \chapter{|}
      this.cm.setCursor({ line: 1, ch: 9 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('')
      expectCursorAt(this.cm, 1, 0)
    })

    it('should delete a chapter command if empty and surrounded by text', function() {
      this.cm.setValue('abc\n' + 'te\\chapter{}xt\n' + 'b\n')
      // Place cursor inside chapter argument
      // te\chapter{|}xt
      this.cm.setCursor({ line: 1, ch: 11 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('text')
      expectCursorAt(this.cm, 1, 2)
    })

    it('should not delete the bracket after a chapter command if empty', function() {
      this.cm.setValue('abc\n' + '\\chapter{}\n' + 'b\n')
      // Place cursor after chapter argument
      // \chapter{}|
      this.cm.setCursor({ line: 1, ch: 10 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('\\chapter{}')
      expectCursorAt(this.cm, 1, 9)
    })

    it('should delete the text before the chapter pressing backspace', function() {
      this.cm.setValue('abc\n' + 'tex\\chapter{chapter}\n' + 'b\n')
      // Place cursor at start of chapter argument, before "chapter" text
      // tex\chapter{|chapter}
      this.cm.setCursor({ line: 1, ch: 12 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('te\\chapter{chapter}')
      expectCursorAt(this.cm, 1, 11)
    })

    it('should do nothing pressing backspace at the end of a chapter', function() {
      this.cm.setValue('abc\n' + 'tex\\chapter{chapter}abc\n' + 'b\n')
      // Place cursor after chapter argument
      // tex\chapter{chapter}|abc
      this.cm.setCursor({ line: 1, ch: 20 })

      fakeNamedKey(this.cm, 'Backspace')

      expect(this.cm.getLine(1)).to.equal('tex\\chapter{chapter}abc')
    })
  })

  describe('Delete key', function() {
    it('should delete a char before the list', function() {
      this.cm.setValue(
        'a\n' +
          '\\begin{enumerate}\n' +
          '\\item FIRST\n' +
          '\\item SECOND\n' +
          '\\begin{enumerate}\n' +
          '\\item h\n' +
          '\\end{enumerate}\n' +
          '\\item THIRD\n' +
          '\\end{enumerate}'
      )
      this.cm.setCursor({ line: 0, ch: 0 })
      fakeNamedKey(this.cm, 'Delete')

      expect(this.cm.getLine(0)).to.equal('')
    })

    it('should correctly delete the chars inside the last item in a list', function() {
      this.cm.setValue(
        '\\begin{enumerate}\n' +
          '\\item a\n' +
          '\\begin{enumerate}\n' +
          '\\item b\n' +
          '\\end{enumerate}\n' +
          '\\item test\n' +
          '\\end{enumerate}'
      )
      this.cm.setCursor({ line: 5, ch: 8 })
      fakeNamedKey(this.cm, 'Delete')

      expect(this.cm.getLine(5)).to.equal('\\item tet')
    })

    it("doesn't error if pressing delete on last character with default keymap", function() {
      this.cm.setValue('foo\n' + 'bar')
      this.cm.setCursor({ line: 1, ch: 3 })

      expect(() => fakeNamedKey(this.cm, 'Delete')).not.to.throw()
    })

    it('should do nothing pressing delete before begin', function() {
      this.cm.setValue(
        '\n' +
          '\\begin{enumerate}\n' +
          '\\item FIRST\n' +
          '\\item SECOND\n' +
          '\\begin{enumerate}\n' +
          '\\item h\n' +
          '\\end{enumerate}\n' +
          '\\item THIRD\n' +
          '\\end{enumerate}'
      )
      // Place cursor at start of first line before \begin
      // |\n
      this.cm.setCursor({ line: 0, ch: 0 })

      fakeNamedKey(this.cm, 'Delete')

      expect(this.cm.getLine(0)).to.equal('')
      expect(this.cm.getLine(1)).to.equal('\\begin{enumerate}')
    })

    it('should do nothing pressing delete before end', function() {
      this.cm.setValue(
        '\n' +
          '\\begin{enumerate}\n' +
          '\\item FIRST\n' +
          '\\item SECOND\n' +
          '\\begin{enumerate}\n' +
          '\\item h\n' +
          '\\end{enumerate}\n' +
          '\\item THIRD\n' +
          '\\end{enumerate}'
      )
      // Place cursor at end of \item h
      // TODO: Think it's not ch: 9 (overflows line, clearly CM handles this)
      this.cm.setCursor({ line: 5, ch: 9 })

      fakeNamedKey(this.cm, 'Delete')

      expect(this.cm.getLine(5)).to.equal('\\item h')
      expect(this.cm.getLine(6)).to.equal('\\end{enumerate}')
    })

    it('should skip when pressing before an abstract', function() {
      this.cm.setValue(
        'aa\n' + '\\begin{abstract}\n' + '\n' + '\\end{abstract}'
      )
      // Place cursor after "aa"
      // aa|
      this.cm.setCursor({ line: 0, ch: 2 })

      fakeNamedKey(this.cm, 'Delete')

      expect(this.cm.getLine(0)).to.equal('aa')
      expectCursorAt(this.cm, 2, 0)
    })

    it('should delete an abstract if empty (with delete key)', function() {
      this.cm.setValue('\\begin{abstract}\n' + '\n' + '\\end{abstract}')
      // Place cursor between \begin and \end
      this.cm.setCursor({ line: 1, ch: 0 })

      fakeNamedKey(this.cm, 'Delete')

      expect(this.cm.getLine(0)).to.equal('')
    })

    it('should do nothing pressing delete at the end of a section', function() {
      this.cm.setValue('abc\n' + 'tex\\section{section}abc\n' + 'b\n')
      // Place cursor at end of section argument, after "section" text
      // tex\section{section|}
      this.cm.setCursor({ line: 1, ch: 19 })

      fakeNamedKey(this.cm, 'Delete')

      expect(this.cm.getLine(1)).to.equal('tex\\section{section}abc')
    })

    it('should do nothing pressing delete at the end of a subsection', function() {
      this.cm.setValue('abc\n' + 'tex\\subsection{subsection}abc\n' + 'b\n')
      // Place cursor at end of subsection argument, after "subsection" text
      // tex\subsection{subsection|}
      this.cm.setCursor({ line: 1, ch: 25 })

      fakeNamedKey(this.cm, 'Delete')

      expect(this.cm.getLine(1)).to.equal('tex\\subsection{subsection}abc')
    })

    it('should do nothing pressing delete at the end of a subsubsection', function() {
      this.cm.setValue(
        'abc\n' + 'tex\\subsubsection{subsubsection}abc\n' + 'b\n'
      )
      // Place cursor at end of subsubsection argument, after "subsubsection"
      // text
      // tex\subsubsection{subsubsection|}abc
      this.cm.setCursor({ line: 1, ch: 31 })

      fakeNamedKey(this.cm, 'Delete')

      expect(this.cm.getLine(1)).to.equal(
        'tex\\subsubsection{subsubsection}abc'
      )
    })

    it('should do nothing pressing delete at the end of a chapter', function() {
      this.cm.setValue('abc\n' + 'tex\\chapter{chapter}abc\n' + 'b\n')
      // Place cursor at end of chapter argument, after "chapter" text
      // tex\chapter{chapter|}abc
      this.cm.setCursor({ line: 1, ch: 19 })

      fakeNamedKey(this.cm, 'Delete')

      expect(this.cm.getLine(1)).to.equal('tex\\chapter{chapter}abc')
    })
  })
})
