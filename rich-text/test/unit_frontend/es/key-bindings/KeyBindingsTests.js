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

  // describe("with vim keymap and autocomplete on", function () {
  //   beforeEach(function () {
  //     _rt = new WL.RichText()
  //     _cm.setOption('vimMode', 'true')
  //     _keymap = new WL.Keymap(new Test.MockUI(), _cm, 'vim', true, true,
  // true, _rt)
  //   })

  //   it("auto-inserts matching chars only in insert mode", function () {
  //     CodeMirror.Vim.handleKey(_cm, 'i')
  //     expect(_cm.state.vim.insertMode).toBeTruthy()
  //     expect(_cm.getValue()).toEqual('')

  //     // match braces
  //     expect(_fakeExtraKey('{')).toBeUndefined()
  //     expect(_cm.getValue()).toEqual('{}')
  //     expectCursorAt(0, 1)

  //     // backspace should clear both characters
  //     _fakeNamedKey('Backspace')
  //     expect(_cm.getValue()).toEqual('')
  //     expectCursorAt(0, 0)

  //     _fakeNamedKey('Esc')
  //     expect(_cm.state.vim.insertMode).toBeFalsy()

  //     //
  //     // when not in insert mode, we need to pass all of the characters that
  //     // we normally trap up to the vim mode, because some of them are
  // movement
  //     // commands
  //     //

  //     // set a dummy value to ensure we don't change anything
  //     _cm.setValue('xy')
  //     _cm.setCursor({ line: 0, ch: 1 })

  //     expect(_fakeExtraKey('{')).toEqual(CodeMirror.Pass)
  //     expect(_cm.getValue()).toEqual('xy')
  //     expectCursorAt(0, 1)

  //     expect(_fakeExtraKey('[')).toEqual(CodeMirror.Pass)
  //     expect(_cm.getValue()).toEqual('xy')
  //     expectCursorAt(0, 1)

  //     expect(_fakeExtraKey('}')).toEqual(CodeMirror.Pass)
  //     expect(_cm.getValue()).toEqual('xy')
  //     expectCursorAt(0, 1)

  //     expect(_fakeExtraKey(']')).toEqual(CodeMirror.Pass)
  //     expect(_cm.getValue()).toEqual('xy')
  //     expectCursorAt(0, 1)

  //     expect(_fakeExtraKey('`')).toEqual(CodeMirror.Pass)
  //     expect(_cm.getValue()).toEqual('xy')
  //     expectCursorAt(0, 1)

  //     expect(_fakeExtraKey("'")).toEqual(CodeMirror.Pass)
  //     expect(_cm.getValue()).toEqual('xy')
  //     expectCursorAt(0, 1)

  //     expect(_fakeExtraKey('\\')).toEqual(CodeMirror.Pass)
  //     expect(_cm.getValue()).toEqual('xy')
  //     expectCursorAt(0, 1)

  //     // backspace should move the cursor back, because it gets passed
  // through
  //     // our extra keys and into the vim mode
  //     _fakeNamedKey('Backspace')
  //     expect(_cm.getValue()).toEqual('xy')
  //     expectCursorAt(0, 0)
  //   })
  // })

  it('doesn\'t error if pressing delete on last character with default keymap', function () {
    this.cm.setValue(
      'foo\n' +
      'bar'
    )
    this.cm.setCursor({ line: 1, ch: 3 })

    expect(() => fakeNamedKey(this.cm, 'Delete')).not.to.throw()
  })

  // it('doesn\'t error if pressing delete on last character with vim keymap',
  // function () {
  //   _keymap = new WL.Keymap(new Test.MockUI(), _cm, 'vim', true, true, true,
  // _rt);
  //   this.cm.setValue(
  //     'foo\n' +
  //     'bar'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 3 })

  //   expect(() => fakeNamedKey(this.cm, 'Delete')).not.to.throw()
  // })

  // it('doesn\'t error if pressing delete on last character with emacs keymap',
  // function () {
  //   _keymap = new WL.Keymap(new Test.MockUI(), _cm, 'emacs', true, true,
  // true, _rt);
  //   this.cm.setValue(
  //     'foo\n' +
  //     'bar'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 3 })

  //   expect(() => fakeNamedKey(this.cm, 'Delete')).not.to.throw()
  // })

  it('should go up a line when inside an empty list', function () {
    this.cm.setValue(
      '\n' +
      '\\begin{itemize}\n' +
      '\\item a\n' +
      '\\item b\n' +
      '\\item c\n' +
      '\\end{itemize}'
    )
    this.cm.setCursor({ line: 4, ch: 7 }) // Cursor after "\item c"

    fakeNamedKey(this.cm, 'Up')
    expectCursorAt(this.cm, 3, 7)
    fakeNamedKey(this.cm, 'Up')
    expectCursorAt(this.cm, 2, 7)
    fakeNamedKey(this.cm, 'Up')
    expectCursorAt(this.cm, 0, 0)
  })
})
