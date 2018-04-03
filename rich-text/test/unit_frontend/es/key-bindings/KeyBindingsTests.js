import CodeMirror from 'codemirror'

import fixture from '../../../../../../test/unit_frontend/es/support/fixture'
import LatexMode from '../../../../public/es/latex-mode/LatexMode'
import RichText from '../../../../public/es/rich-text/RichText'
import keyBindings from '../../../../public/es/key-bindings/KeyBindings'

const FIXTURE_HTML = `<div class="rich-text">
<link rel="stylesheet" href="base/public/stylesheets/style.css">
<textarea id="cm"></textarea>
</div>
`

describe('Key bindings', function () {
  beforeEach(function () {
    const html = fixture.load(FIXTURE_HTML)
    this.textarea = html.querySelector('#cm')

    CodeMirror.defineMode('latex', () => new LatexMode())
    this.cm = CodeMirror.fromTextArea(this.textarea, {
      mode: 'latex',
      extraKeys: keyBindings
    })

    this.rt = new RichText(this.cm, {})
    this.rt.enable()
  })

  afterEach(function () {
    fixture.cleanUp()
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
  function fakeNamedKey (cm, keyName) {
    var ctrl, shift, alt
    var key = keyName.replace(/\w+-/g, function (type) {
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
      preventDefault: function () {},
      stopPropagation: function () {}
    })
  }

  // /**
  //  * Call directly into the extraKeys map that we set.
  //  *
  //  * NB this does NOT actually pass the events further up the handler chain,
  // so
  //  * it may not have the full effect on the document; you can however check
  //  * whether it does pass by checking whether this returns CodeMirror.Pass.
  //  */
  // function _fakeExtraKey (key) {
  //   if (key.length == 1) {
  //     return _cm.getOption('extraKeys')["'" + key + "'"](_cm)
  //   } else {
  //     return _cm.getOption('extraKeys')[key](_cm)
  //   }
  // }

  // function _clear () {
  //   _cm.setValue('')
  // }

  function expectCursorAt (cm, line, ch) {
    var cursor = cm.getCursor()
    expect(cursor.line).to.equal(line)
    expect(cursor.ch).to.equal(ch)
  }

  // describe("Matching brackets", function () {
  //   afterEach(function () {
  //     _clear()
  //   })

  // it("auto-inserts matching braces, brackets and quotes", function () {
  //   // match braces
  //   expect(_fakeExtraKey('{')).toBeUndefined()
  //   expect(_cm.getValue()).toEqual('{}')
  //   expectCursorAt(0, 1)

  //   // backspace should clear both characters
  //   _fakeNamedKey('Backspace')
  //   expect(_cm.getValue()).toEqual('')
  //   expectCursorAt(0, 0)

  //   // match brackets
  //   expect(_fakeExtraKey('[')).toBeUndefined()
  //   expect(_cm.getValue()).toEqual('[]')
  //   expectCursorAt(0, 1)

  //   // backspace should clear both characters
  //   _fakeNamedKey('Backspace')
  //   expect(_cm.getValue()).toEqual('')
  //   expectCursorAt(0, 0)

  //   // match single quotes
  //   expect(_fakeExtraKey('`')).toBeUndefined()
  //   expect(_cm.getValue()).toEqual("`'")
  //   expectCursorAt(0, 1)

  //   // backspace should clear both characters
  //   _fakeNamedKey('Backspace')
  //   expect(_cm.getValue()).toEqual('')
  //   expectCursorAt(0, 0)

  //   // match double quotes
  //   expect(_fakeExtraKey('`')).toBeUndefined()
  //   expect(_cm.getValue()).toEqual("`'")
  //   expectCursorAt(0, 1)
  //   expect(_fakeExtraKey('`')).toBeUndefined()
  //   expect(_cm.getValue()).toEqual("``''")
  //   expectCursorAt(0, 2)

  //   // backspace should clear inner quotes, then outer quotes
  //   _fakeNamedKey('Backspace')
  //   expect(_cm.getValue()).toEqual("`'")
  //   expectCursorAt(0, 1)
  //   _fakeNamedKey('Backspace')
  //   expect(_cm.getValue()).toEqual("")
  //   expectCursorAt(0, 0)

  //   // don't bother matching parentheses any more
  //   expect(_cm.getOption('extraKeys')['(']).toBeUndefined()
  //   expect(_cm.getOption('extraKeys')[')']).toBeUndefined()

  //   // don't insert matching bracket when oppening bracket is just before a
  //   // string
  //   _cm.setValue('xy')
  //   _fakeExtraKey('{')
  //   expect(_cm.getValue()).toEqual('{xy')
  //   _fakeExtraKey('[')
  //   expect(_cm.getValue()).toEqual('{[xy')
  //   _fakeExtraKey('`')
  //   expect(_cm.getValue()).toEqual('{[`xy')

  //   // don't try to be smart when something is selected
  //   _cm.setValue('xy')
  //   _cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 2 })
  //   // all _fakeExtraKey should fail writting anything because it should
  //   // return a CodeMirror.Pass as something is selected
  //   _fakeExtraKey('{')
  //   _fakeExtraKey('}')
  //   _fakeExtraKey('[')
  //   _fakeExtraKey(']')
  //   _fakeExtraKey('`')
  //   _fakeExtraKey('\'')
  //   expect(_cm.getValue()).toEqual('xy')
  // })

  //   it('auto-inserts matching braces, brackets and quotes with multiple
  // cursors', function () {
  //     function expectRangesMatch (expectedRange, actualRange) {
  //       expect(expectedRange[0].anchor).toEqual(actualRange[0].anchor)
  //       expect(expectedRange[0].head).toEqual(actualRange[0].head)
  //       expect(expectedRange[1].anchor).toEqual(actualRange[1].anchor)
  //       expect(expectedRange[1].head).toEqual(actualRange[1].head)
  //     }

  //     function testAutoInsertionWithMultipleCursors (openingChar, closingChar
  // ) {
  //       // Initialise with 2 empty lines & set cursor on both lines
  //       _cm.setValue(
  //         '\n' +
  //         ''
  //       )
  //       _cm.setSelections([
  //         { anchor: CodeMirror.Pos(0, 0), head: CodeMirror.Pos(0, 0) },
  //         { anchor: CodeMirror.Pos(1, 0), head: CodeMirror.Pos(1, 0) }
  //       ])

  //       // Press opening char key
  //       _fakeExtraKey(openingChar)

  //       // Opening & closing chars to be inserted
  //       expect(_cm.getValue()).toBe(
  //         openingChar + closingChar + '\n' +
  //         openingChar + closingChar
  //       )
  //       // Cursor should be inbetween the opening & closing chars
  //       expectRangesMatch(_cm.listSelections(), [
  //         { anchor: CodeMirror.Pos(0, 1), head: CodeMirror.Pos(0, 1) },
  //         { anchor: CodeMirror.Pos(1, 1), head: CodeMirror.Pos(1, 1) },
  //       ])

  //       // Press closing char key
  //       _fakeExtraKey(closingChar)

  //       // Cursor should be after the opening & closing chars
  //       expectRangesMatch(_cm.listSelections(), [
  //         { anchor: CodeMirror.Pos(0, 2), head: CodeMirror.Pos(0, 2) },
  //         { anchor: CodeMirror.Pos(1, 2), head: CodeMirror.Pos(1, 2) },
  //       ])

  //       // Reset the cursors back inbetween the opening & closing chars
  //       _cm.setSelections([
  //         { anchor: CodeMirror.Pos(0, 1), head: CodeMirror.Pos(0, 1) },
  //         { anchor: CodeMirror.Pos(1, 1), head: CodeMirror.Pos(1, 1) },
  //       ])

  //       // Press the Backspace key
  //       _fakeNamedKey('Backspace')

  //       // Lines should be empty (closing char is also removed)
  //       expect(_cm.getValue()).toBe(
  //         '\n' +
  //         ''
  //       )
  //       // Cursor should be at the SOL
  //       expect(_cm.listSelections(), [
  //         { anchor: CodeMirror.Pos(0, 0), head: CodeMirror.Pos(0, 0) },
  //         { anchor: CodeMirror.Pos(1, 0), head: CodeMirror.Pos(1, 0) }
  //       ])
  //     }

  //     testAutoInsertionWithMultipleCursors('{', '}')
  //     testAutoInsertionWithMultipleCursors('[', ']')
  //     testAutoInsertionWithMultipleCursors('`', '\'')
  //   })
  // })

  // it('should add a new item on a list', function () {
  //   this.cm.setValue(
  //     '\\begin{enumerate}\n' +
  //     '\\item FIRST\n' +
  //     '\\item SECOND\n' +
  //     '\\begin{enumerate}\n' +
  //     '\\item FIRST\n' +
  //     '\\end{enumerate}\n' +
  //     '\\item THIRD\n' +
  //     '\\end{enumerate}'
  //   )
  //   this.cm.setCursor({ line: 4, ch: 11 })
  //   fakeNamedKey(this.cm, 'Enter')

  //   var newCursor = this.cm.getCursor()
  //   expect(newCursor.line).to.equal(5)
  //   expect(newCursor.ch).to.equal(6)
  //   this.cm.replaceRange('SECOND', newCursor, newCursor)
  //   var token = this.cm.getTokenAt(this.cm.getCursor(), true)
  //   var lastClosedMark = token.state.marks[token.state.marks.length - 1]
  //   expect(token.string).to.equal('SECOND')
  //   expect(token.state.openMarks.length).to.equal(2)
  //   expect(lastClosedMark.checkedProperties.number).to.equal(2)
  // })

  it('should move a list to a new line when the cursor is before begin{...}', function () {
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

  // it('should remove the last empty item pressing enter two times',
  // function () {
  //   this.cm.setValue(
  //     '\\begin{enumerate}\n' +
  //     '\\item FIRST\n' +
  //     '\\item SECOND\n' +
  //     '\\begin{enumerate}\n' +
  //     '\\item h\n' +
  //     '\\end{enumerate}\n' +
  //     '\\item THIRD\n' +
  //     '\\end{enumerate}'
  //   )
  //   this.cm.setCursor({ line: 6, ch: 14 })
  //   fakeNamedKey(this.cm, 'Enter')

  //   var newCursor = this.cm.getCursor()
  //   expect(newCursor.line).to.equal(7)
  //   expect(newCursor.ch).to.equal(6)
  //   expect(this.cm.getLine(7)).to.equal('\\item ')
  //   fakeNamedKey(this.cm, 'Enter')
  //   expect(this.cm.getLine(7)).to.equal('\\end{enumerate}')
  //   expect(this.cm.getLine(8)).to.equal('')
  // })

  it('should delete the inner environment pressing backspace on the item', function () {
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

  it('should delete a char before the list', function () {
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

  // it('should place the last empty of nested list as item of the outer list',
  // function () {
  //   this.cm.setValue(
  //     '\\begin{enumerate}\n' +
  //     '\\item FIRST\n' +
  //     '\\item SECOND\n' +
  //     '\\begin{enumerate}\n' +
  //     '\\item h\n' +
  //     '\\end{enumerate}\n' +
  //     '\\item THIRD\n' +
  //     '\\end{enumerate}'
  //   )
  //   this.cm.setCursor({ line: 4, ch: 8 })
  //   fakeNamedKey(this.cm, 'Enter')

  //   var newCursor = this.cm.getCursor()
  //   expect(newCursor.line).to.equal(5)
  //   expect(newCursor.ch).to.equal(6)
  //   expect(this.cm.getLine(5)).to.equal('\\item ')
  //   fakeNamedKey(this.cm, 'Enter')
  //   expect(this.cm.getLine(5)).to.equal('\\end{enumerate}')
  //   expect(this.cm.getLine(6)).to.equal('\\item ')
  // })

  it('should correctly delete the chars inside the last item in a list', function () {
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

  it('should not insert an item when inside an open mark', function () {
    this.cm.setValue(
      '\\begin{itemize}\n' +
      '\\item \\textbf{abcabc}\n' +
      '\\end{itemize}'
    )
    this.cm.setCursor({ line: 1, ch: 16 })
    fakeNamedKey(this.cm, 'Enter')

    expect(this.cm.getLine(1)).to.equal('\\item \\textbf{ab')
    expect(this.cm.getLine(2)).to.equal('cabc}')
  })

  it('should not insert a new item if begin{..} is not alone on the line', function () {
    this.cm.setValue(
      '\\DeclareDocumentCommand\\ben{ O{1.)} }{\\begin{enumerate}[#1]}\n' +
      '\\DeclareDocumentCommand\\ben{ O{1.)} }' +
      '{%\\begin{enumerate}%[#1]}'
    )
    this.cm.setCursor({ line: 0, ch: 60 })
    fakeNamedKey(this.cm, 'Enter')

    expect(this.cm.getLine(1)).to.equal('')
  })

  it('should go up in rich text mode even if there are no marks', function () {
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

  it('doesn\'t error if pressing delete on last character with default keymap', function () {
    this.cm.setValue(
      'foo\n' +
      'bar'
    )
    this.cm.setCursor({ line: 1, ch: 3 })

    expect(() => fakeNamedKey(this.cm, 'Delete')).not.to.throw()
  })

  it('should go up a line when inside an empty list', function (done) {
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
      this.cm.refresh()
      fakeNamedKey(this.cm, 'Up')
      expectCursorAt(this.cm, 3, 7)
      fakeNamedKey(this.cm, 'Up')
      expectCursorAt(this.cm, 2, 7)
      fakeNamedKey(this.cm, 'Up')
      expectCursorAt(this.cm, 0, 0)
      done()
    })
  })

  it('should place the first item before begin pressing backspace', function () {
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

  it('should be able to delete a character immediately after a section', function () {
    this.cm.setValue(
      '\\section{foo\n' +
      '}\n' +
      'x'
    )

    var linesBeforeDelete = this.cm.getValue().split('\n')
    expect(linesBeforeDelete).to.deep.equal(['\\section{foo', '}', 'x'])
    // Place cursor after "x"
    // x|
    this.cm.setCursor({ line: 2, ch: 1 })

    fakeNamedKey(this.cm, 'Backspace')

    var linesAfterDelete = this.cm.getValue().split('\n')
    expect(linesAfterDelete).to.deep.equal(['\\section{foo', '}', ''])
  })

  it('should do nothing pressing delete before begin', function () {
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

  it('should do nothing pressing delete before end', function () {
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

  it('should go back one line before section, if that line is blank', function () {
    this.cm.setValue(
      '\n' +
      '\\section{a}'
    )
    // Place cursor before "a"
    // \section{|a}
    this.cm.setCursor({ line: 1, ch: 9 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(0)).to.equal('\\section{a}')
  })

  it('should place cursor back one line, if the line before is not empty', function () {
    this.cm.setValue(
      'abc\n' +
      '\\section{a}'
    )
    // Place cursor before "a"
    // \section{|a}
    this.cm.setCursor({ line: 1, ch: 9 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(0)).to.equal('abc')
    expectCursorAt(this.cm, 0, 3)
  })

  it('should place cursor in the section, after pressing backspace at the line after (with contents)', function () {
    this.cm.setValue(
      'abc\n' +
      '\\section{a}\n' +
      'aaa'
    )
    // Place cursor before "aaa"
    // |aaa
    this.cm.setCursor({ line: 2, ch: 0 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('\\section{a}')
    expectCursorAt(this.cm, 1, 10)
  })

  it('should place cursor in the section and remove the ling, after pressing backspace at the line after (without contents)', function () {
    this.cm.setValue(
      'abc\n' +
      '\\section{a}\n' +
      'b\n'
    )
    // Place cursor before "b"
    // |b
    this.cm.setCursor({ line: 2, ch: 0 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('\\section{a}')
    expectCursorAt(this.cm, 1, 10)
    expect(this.cm.getLine(2)).to.equal('b')
  })

  it('should delete an abstract if empty', function () {
    this.cm.setValue(
      '\\begin{abstract}\n' +
      '\n' +
      '\\end{abstract}'
    )
    // Place cursor on line between \begin and \end
    this.cm.setCursor({ line: 1, ch: 0 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(0)).to.equal('')
  })

  it('should skip when pressing before an abstract', function () {
    this.cm.setValue(
      'aa\n' +
      '\\begin{abstract}\n' +
      '\n' +
      '\\end{abstract}'
    )
    // Place cursor after "aa"
    // aa|
    this.cm.setCursor({ line: 0, ch: 2 })

    fakeNamedKey(this.cm, 'Delete')

    expect(this.cm.getLine(0)).to.equal('aa')
    expectCursorAt(this.cm, 2, 0)
  })

  it('should skip when pressing backspace after an abstract', function () {
    this.cm.setValue(
      '\\begin{abstract}\n' +
      '\n' +
      '\\end{abstract}\n' +
      'aa'
    )
    // Place cursor before "aa"
    // |aa
    this.cm.setCursor({ line: 3, ch: 0 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(3)).to.equal('aa')
    expectCursorAt(this.cm, 1, 0)
  })

  it('should delete an abstract if empty (with delete key)', function () {
    this.cm.setValue(
      '\\begin{abstract}\n' +
      '\n' +
      '\\end{abstract}'
    )
    // Place cursor between \begin and \end
    this.cm.setCursor({ line: 1, ch: 0 })

    fakeNamedKey(this.cm, 'Delete')

    expect(this.cm.getLine(0)).to.equal('')
  })

  it('should delete a section command if empty', function () {
    this.cm.setValue(
      'abc\n' +
      '\\section{}\n' +
      'b\n'
    )
    // Place cursor within section argument
    // \section{|}
    this.cm.setCursor({ line: 1, ch: 9 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('')
    expectCursorAt(this.cm, 1, 0)
  })

  it('should delete a section command if empty and surrounded by text', function () {
    this.cm.setValue(
      'abc\n' +
      'te\\section{}xt\n' +
      'b\n'
    )
    // Place cursor within section argument
    // te\section{|}xt
    this.cm.setCursor({ line: 1, ch: 11 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('text')
    expectCursorAt(this.cm, 1, 2)
  })

  it('should not delete the bracket after a section command if empty', function () {
    this.cm.setValue(
      'abc\n' +
      '\\section{}\n' +
      'b\n'
    )
    // Place cursor after section argument
    // \section{}|
    this.cm.setCursor({ line: 1, ch: 10 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('\\section{}')
    expectCursorAt(this.cm, 1, 9)
  })

  it('should delete the text before the section pressing backspace', function () {
    this.cm.setValue(
      'abc\n' +
      'tex\\section{section}\n' +
      'b\n'
    )
    // Place cursor at beginning of section argument, before "section" text
    // tex\section{|section}
    this.cm.setCursor({ line: 1, ch: 12 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('te\\section{section}')
    expectCursorAt(this.cm, 1, 11)
  })

  it('should do nothing pressing delete at the end of a section', function () {
    this.cm.setValue(
      'abc\n' +
      'tex\\section{section}abc\n' +
      'b\n'
    )
    // Place cursor at end of section argument, after "section" text
    // tex\section{section|}
    this.cm.setCursor({ line: 1, ch: 19 })

    fakeNamedKey(this.cm, 'Delete')

    expect(this.cm.getLine(1)).to.equal('tex\\section{section}abc')
  })

  it('should do nothing pressing backspace at the end of a section', function () {
    this.cm.setValue(
      'abc\n' +
      'tex\\section{section}abc\n' +
      'b\n'
    )
    // Place cursor at end of section argument, after "section" text
    // tex\section{section|}abc
    this.cm.setCursor({ line: 1, ch: 20 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('tex\\section{section}abc')
  })

  it('should delete a subsection command if empty', function () {
    this.cm.setValue(
      'abc\n' +
      '\\subsection{}\n' +
      'b\n'
    )
    // Place cursor inside subsection argument
    // \subsection{|}
    this.cm.setCursor({ line: 1, ch: 12 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('')
    expectCursorAt(this.cm, 1, 0)
  })

  it('should delete a subsection command if empty and surrounded by text', function () {
    this.cm.setValue(
      'abc\n' +
      'te\\subsection{}xt\n' +
      'b\n'
    )
    // Place cursor inside subsection argument
    // te\subsection{|}xt
    this.cm.setCursor({ line: 1, ch: 14 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('text')
    expectCursorAt(this.cm, 1, 2)
  })

  it('should not delete the bracket after a subsection command if empty', function () {
    this.cm.setValue(
      'abc\n' +
      '\\subsection{}\n' +
      'b\n'
    )
    // Place cursor after subsection argument
    // \subsection{}|
    this.cm.setCursor({ line: 1, ch: 13 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('\\subsection{}')
    expectCursorAt(this.cm, 1, 12)
  })

  it('should delete the text before the subsection pressing backspace', function () {
    this.cm.setValue(
      'abc\n' +
      'tex\\subsection{subsection}\n' +
      'b\n'
    )
    // Place cursor at start of \subsection argument, before "subsection" text
    // tex\subsection{|subsection}
    this.cm.setCursor({ line: 1, ch: 15 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('te\\subsection{subsection}')
    expectCursorAt(this.cm, 1, 14)
  })

  it('should do nothing pressing delete at the end of a subsection', function () {
    this.cm.setValue(
      'abc\n' +
      'tex\\subsection{subsection}abc\n' +
      'b\n'
    )
    // Place cursor at end of subsection argument, after "subsection" text
    // tex\subsection{subsection|}
    this.cm.setCursor({ line: 1, ch: 25 })

    fakeNamedKey(this.cm, 'Delete')

    expect(this.cm.getLine(1)).to.equal('tex\\subsection{subsection}abc')
  })

  it('should do nothing pressing backspace at the end of a subsection', function () {
    this.cm.setValue(
      'abc\n' +
      'tex\\subsection{subsection}abc\n' +
      'b\n'
    )
    // Place cursor at end of subsection argument, after "subsection" text
    // tex\subsection{subsection|}abc
    this.cm.setCursor({ line: 1, ch: 26 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('tex\\subsection{subsection}abc')
  })

  it('should delete a subsubsection command if empty', function () {
    this.cm.setValue(
      'abc\n' +
      '\\subsubsection{}\n' +
      'b\n'
    )
    // Place cursor inside subsubsection argument
    // \subsubsection{|}
    this.cm.setCursor({ line: 1, ch: 15 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('')
    expectCursorAt(this.cm, 1, 0)
  })

  it('should delete a subsubsection command if empty and surrounded by text', function () {
    this.cm.setValue(
      'abc\n' +
      'te\\subsubsection{}xt\n' +
      'b\n'
    )
    // Place cursor inside subsubsection argument
    // tx\subsubsection{|}
    this.cm.setCursor({ line: 1, ch: 17 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('text')
    expectCursorAt(this.cm, 1, 2)
  })

  it('should not delete the bracket after a subsubsection command if empty', function () {
    this.cm.setValue(
      'abc\n' +
      '\\subsubsection{}\n' +
      'b\n'
    )
    // Place cursor after subsubsection argument
    // \subsubsection{}|
    this.cm.setCursor({ line: 1, ch: 16 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('\\subsubsection{}')
    expectCursorAt(this.cm, 1, 15)
  })

  it('should delete the text before the subsubsection pressing backspace', function () {
    this.cm.setValue(
      'abc\n' +
      'tex\\subsubsection{subsubsection}\n' +
      'b\n'
    )
    // Place cursor at start of subsubsection argument, before "subsubsection"
    // text
    // tex\subsubsection{|subsubsection}
    this.cm.setCursor({ line: 1, ch: 18 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('te\\subsubsection{subsubsection}')
    expectCursorAt(this.cm, 1, 17)
  })

  it('should do nothing pressing delete at the end of a subsubsection', function () {
    this.cm.setValue(
      'abc\n' +
      'tex\\subsubsection{subsubsection}abc\n' +
      'b\n'
    )
    // Place cursor at end of subsubsection argument, after "subsubsection" text
    // tex\subsubsection{subsubsection|}abc
    this.cm.setCursor({ line: 1, ch: 31 })

    fakeNamedKey(this.cm, 'Delete')

    expect(this.cm.getLine(1)).to.equal(
      'tex\\subsubsection{subsubsection}abc'
    )
  })

  it('should do nothing pressing backspace at the end of a subsubsection', function () {
    this.cm.setValue(
      'abc\n' +
      'tex\\subsubsection{subsubsection}abc\n' +
      'b\n'
    )
    // Place cursor after subsubsection argument, before "abc" text
    // tex\subsubsection{subsubsection}|abc
    this.cm.setCursor({ line: 1, ch: 32 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal(
      'tex\\subsubsection{subsubsection}abc'
    )
  })

  it('should delete a chapter command if empty', function () {
    this.cm.setValue(
      'abc\n' +
      '\\chapter{}\n' +
      'b\n'
    )
    // Place cursor inside chapter argument
    // \chapter{|}
    this.cm.setCursor({ line: 1, ch: 9 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('')
    expectCursorAt(this.cm, 1, 0)
  })

  it('should delete a chapter command if empty and surrounded by text', function () {
    this.cm.setValue(
      'abc\n' +
      'te\\chapter{}xt\n' +
      'b\n'
    )
    // Place cursor inside chapter argument
    // te\chapter{|}xt
    this.cm.setCursor({ line: 1, ch: 11 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('text')
    expectCursorAt(this.cm, 1, 2)
  })

  it('should not delete the bracket after a chapter command if empty', function () {
    this.cm.setValue(
      'abc\n' +
      '\\chapter{}\n' +
      'b\n'
    )
    // Place cursor after chapter argument
    // \chapter{}|
    this.cm.setCursor({ line: 1, ch: 10 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('\\chapter{}')
    expectCursorAt(this.cm, 1, 9)
  })

  it('should delete the text before the chapter pressing backspace', function () {
    this.cm.setValue(
      'abc\n' +
      'tex\\chapter{chapter}\n' +
      'b\n'
    )
    // Place cursor at start of chapter argument, before "chapter" text
    // tex\chapter{|chapter}
    this.cm.setCursor({ line: 1, ch: 12 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('te\\chapter{chapter}')
    expectCursorAt(this.cm, 1, 11)
  })

  it('should do nothing pressing delete at the end of a chapter', function () {
    this.cm.setValue(
      'abc\n' +
      'tex\\chapter{chapter}abc\n' +
      'b\n'
    )
    // Place cursor at end of chapter argument, after "chapter" text
    // tex\chapter{chapter|}abc
    this.cm.setCursor({ line: 1, ch: 19 })

    fakeNamedKey(this.cm, 'Delete')

    expect(this.cm.getLine(1)).to.equal('tex\\chapter{chapter}abc')
  })

  it('should do nothing pressing backspace at the end of a chapter', function () {
    this.cm.setValue(
      'abc\n' +
      'tex\\chapter{chapter}abc\n' +
      'b\n'
    )
    // Place cursor after chapter argument
    // tex\chapter{chapter}|abc
    this.cm.setCursor({ line: 1, ch: 20 })

    fakeNamedKey(this.cm, 'Backspace')

    expect(this.cm.getLine(1)).to.equal('tex\\chapter{chapter}abc')
  })
})
