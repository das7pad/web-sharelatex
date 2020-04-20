/* global sinon */

import fixture from '../../../../../../test/frontend/support/fixture'
import { Editor } from '../../../../frontend/js/rich_text_editor'
import * as TextWrapping from '../../../../frontend/js/key_bindings/text_wrapping'

const TEXTAREA_HTML = '<textarea></textarea>'

const autocompleteAdapterStub = {
  getBeginCommandArguments: () => ['environmentName']
}

describe('Text wrapping', function () {
  beforeEach(function () {
    this.editor = new Editor(
      fixture.load(TEXTAREA_HTML),
      {},
      autocompleteAdapterStub,
      {},
      sinon.stub()
    )
    this.cm = this.editor.getCodeMirror()
  })

  afterEach(function () {
    fixture.cleanUp()
  })

  it('wraps with \\textbf', function () {
    this.cm.setValue('foo')
    this.cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 3 }) // Select all

    TextWrapping.wrapBold(this.cm)

    expect(this.cm.getValue()).to.equal('\\textbf{foo}')
  })

  it('wraps with \\textit', function () {
    this.cm.setValue('foo')
    this.cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 3 }) // Select all

    TextWrapping.wrapItalic(this.cm)

    expect(this.cm.getValue()).to.equal('\\textit{foo}')
  })

  // it('wraps with \\section', function () {
  //   _cm.setValue('foo')
  //   _cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 3 })

  //   TextWrapping.wrapSection()

  //   expect(_cm.getValue()).toEqual('\\section{foo}')
  // })

  // it('wraps with \\subsection', function () {
  //   _cm.setValue('foo')
  //   _cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 3 })

  //   TextWrapping.wrapSubsection()

  //   expect(_cm.getValue()).toEqual('\\subsection{foo}')
  // })

  // it('wraps with inline math', function () {
  //   _cm.setValue('foo')
  //   _cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 3 })

  //   TextWrapping.wrapInlineMath()

  //   expect(_cm.getValue()).toEqual('\\(foo\\)')
  // })

  // it('wraps with display math', function () {
  //   _cm.setValue('foo')
  //   _cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 3 })

  //   TextWrapping.wrapDisplayMath()

  //   expect(_cm.getValue()).toEqual('\\[foo\\]')
  // })

  it('inserts empty mark if nothing selected', function () {
    TextWrapping.wrapBold(this.cm)

    expect(this.cm.getValue()).to.equal('\\textbf{}')
  })

  it('inserts if selection head before anchor', function () {
    this.cm.setValue('foo')
    this.cm.setSelection({ line: 0, ch: 3 }, { line: 0, ch: 0 })

    TextWrapping.wrapBold(this.cm)

    expect(this.cm.getValue()).to.equal('\\textbf{foo}')
  })

  it('maintains selection after wrapping', function () {
    this.cm.setValue('foo')
    this.cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 3 })

    TextWrapping.wrapBold(this.cm)

    var selections = this.cm.listSelections()
    var selection = selections[0]
    expect(selections.length).to.equal(1)
    // Selection is still the same, even though we have inserted text on either
    // side of it
    expect(this.cm.getRange(selection.from(), selection.to())).to.equal('foo')
  })

  it('removes unnecessary marks of the same kind within the wrap', function () {
    this.cm.setValue('\\textbf{foo} \\textbf{bar} baz')
    this.cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 46 }) // Select all

    TextWrapping.wrapBold(this.cm)

    expect(this.cm.getValue()).to.equal('\\textbf{foo bar baz}')
  })

  // it('does not wrap if nested within an header', function () {
  //   _cm.setValue('\\section*{foo}')
  //   _cm.setSelection({ line: 0, ch: 9 }, { line: 0, ch: 12 })

  //   TextWrapping.wrapSection()

  //   expect(_cm.getValue()).toEqual('\\section*{foo}')
  // })

  it('does not wrap if already nested within outer bold or italic mark', function () {
    this.cm.setValue('\\textbf{\\textit{foo}}')
    this.cm.setSelection({ line: 0, ch: 16 }, { line: 0, ch: 19 })

    TextWrapping.wrapBold(this.cm)

    expect(this.cm.getValue()).to.equal('\\textbf{\\textit{foo}}')

    // This is possibly feasable to implement at some point - we could remove
    // the outer \textbf in this example. However, there is a more complex
    // example: \textbf{foo \textit{bar}} where bar is selected and attempting
    // to wrap in \textbf/
  })

  it('removes existing bold or italic mark if entire content is selected', function () {
    this.cm.setValue('\\textbf{foo}')
    // Select all content - "foo"
    this.cm.setSelection({ line: 0, ch: 8 }, { line: 0, ch: 11 })

    TextWrapping.wrapBold(this.cm)

    expect(this.cm.getValue()).to.equal('foo')
  })

  it('moves selection before bold or italic mark if selection starts at beginning of content', function () {
    this.cm.setValue('\\textbf{foo bar}')
    // Select from beginning of content - "foo", but not " bar"
    this.cm.setSelection({ line: 0, ch: 8 }, { line: 0, ch: 11 })

    TextWrapping.wrapBold(this.cm)

    // Note that whitespace is moved out of the mark
    expect(this.cm.getValue()).to.equal('foo \\textbf{bar}')
  })

  it('moves selection after bold or italic mark if selection ends at end of content', function () {
    this.cm.setValue('\\textbf{foo bar}')
    // Select from end of content - "bar", but not "foo"
    this.cm.setSelection({ line: 0, ch: 12 }, { line: 0, ch: 15 })

    TextWrapping.wrapBold(this.cm)

    // Note that whitespace is moved out of the mark
    expect(this.cm.getValue()).to.equal('\\textbf{foo} bar')
  })

  it('extracts the selection out of a bold or italic mark when attempting wrap an existing mark', function () {
    this.cm.setValue('\\textbf{foo bar baz}')
    // Select within the content - "bar", but not "foo " or " baz"
    this.cm.setSelection({ line: 0, ch: 12 }, { line: 0, ch: 15 })

    TextWrapping.wrapBold(this.cm)

    // Note that whitespace is moved out of the marks
    expect(this.cm.getValue()).to.equal('\\textbf{foo} bar \\textbf{baz}')
  })

  it('handles newlines when extracting selection out of a bold or italic mark when attempting to wrap an existing mark', function () {
    this.cm.setValue('\\textbf{foo bar \nbaz}')
    // Select multiple lines - "bar\n"
    this.cm.setSelection({ line: 0, ch: 12 }, { line: 1, ch: 0 })

    TextWrapping.wrapBold(this.cm)

    // Note that whitespace is moved out of the marks
    expect(this.cm.getValue()).to.equal('\\textbf{foo} bar \n\\textbf{baz}')
  })

  // it('selects current line if attempting to wrap whole line', function () {
  //   _cm.setValue('foo\nbar')
  //   // No selection, cursor at beginning of first line
  //   _cm.setCursor({ line: 0, ch: 0 })

  //   TextWrapping.wrapSection()

  //   expect(_cm.getValue()).toEqual('\\section{foo}\nbar')
  //   var selections = _cm.listSelections()
  //   expect(selections.length).toEqual(1)
  //   expect(selections[0].from()).toEqual(CodeMirror.Pos(0, 9))
  //   expect(selections[0].to()).toEqual(CodeMirror.Pos(0, 12))
  // })

  // it('moves selection to newline if attempting to wrap whole line and line
  // is not selected', function () {
  //   _cm.setValue('foo bar baz')
  //   // Select only part of the line - "bar" but not "foo " or " baz"
  //   _cm.setSelection({ line: 0, ch: 4 }, { line: 0, ch: 7 })

  //   TextWrapping.wrapSection()

  //   expect(_cm.getValue()).toEqual('foo \n\\section{bar}\n baz')
  // })

  // it('does not add extra newline if attempting to wrap whole line and
  // selection ends at EOL', function () {
  //   _cm.setValue(
  //     'foo\n' +
  //     'bar\n' +
  //     ''
  //   )
  //   // Select end of the second line - "ar". Note that the selection ends at
  // the
  //   // end of the line
  //   _cm.setSelection({ line: 1, ch: 1 }, { line: 1, ch: 3 })

  //   TextWrapping.wrapDisplayMath()

  //   expect(_cm.getValue().split('\n')).toEqual([
  //     'foo',
  //     'b',
  //     '\\[ar\\]',
  //     '' // Doesn't add extra newline, as there is already a blank line below
  //   ])
  // })

  // it('does not add extra newline if attempting to wrap whole line and
  // selection starts at SOL', function () {
  //   _cm.setValue(
  //     '\n' +
  //     'foo\n' +
  //     'bar'
  //   )
  //   // Select start of second line - "fo". Note that the selection starts at
  // the
  //   // start of the line
  //   _cm.setSelection({ line: 1, ch: 0 }, { line: 1, ch: 2 })

  //   TextWrapping.wrapDisplayMath()

  //   expect(_cm.getValue().split('\n')).toEqual([
  //     '',
  //     '\\[fo\\]',
  //     'o',
  //     'bar'
  //   ])
  // })

  // describe('Lists', function () {
  //   it('inserts a numbered list', function () {
  //     // On empty line and not within mark
  //     _cm.setValue('')

  //     TextWrapping.wrapNumberedList()

  //     expect(_cm.getValue()).toEqual(
  //       '\\begin{enumerate}\n' +
  //       '\\item \n' +
  //       '\\end{enumerate}\n'
  //     )
  //   })

  //   // NOTE: Bullet lists have the same behaviour as numbered lists - apart
  // from
  //   // "enumerate"/"itemize" - so bullet list's behaviour is not fully tested
  //   it('inserts a bullet list', function () {
  //     _cm.setValue('')

  //     TextWrapping.wrapBulletList()

  //     expect(_cm.getValue()).toEqual(
  //       '\\begin{itemize}\n' +
  //       '\\item \n' +
  //       '\\end{itemize}\n'
  //     )
  //   })

  //   it('adds whitespace around numbered list if cursor is in middle of line',
  // function () {
  //     _cm.setValue('foobar')
  //     // Place cursor in middle of line
  //     _cm.setCursor({ line: 0, ch: 3 })

  //     TextWrapping.wrapNumberedList()

  //     expect(_cm.getValue()).toEqual(
  //       'foo\n' +
  //       '\\begin{enumerate}\n' +
  //       '\\item \n' +
  //       '\\end{enumerate}\n' +
  //       'bar'
  //     )
  //   })

  //   it('adds whitespace before numbered list if cursor is at end of line',
  // function () {
  //     _cm.setValue('foo')
  //     // Place cursor at end of first line
  //     _cm.setSelection({ line: 0, ch: 3 })

  //     TextWrapping.wrapNumberedList()

  //     expect(_cm.getValue()).toEqual(
  //       'foo\n' + // Add newline before list
  //       '\\begin{enumerate}\n' +
  //       '\\item \n' +
  //       '\\end{enumerate}'
  //     )
  //   })

  //   it('wraps selection in a numbered list', function () {
  //     _cm.setValue('foobar')
  //     // Select "foo" - not "bar"
  //     _cm.setSelection({ line: 0, ch: 0 }, { line: 0, ch: 3 })

  //     TextWrapping.wrapNumberedList()

  //     expect(_cm.getValue()).toEqual(
  //       '\n' +
  //       '\\begin{enumerate}\n' +
  //       '\\item foo\n' +
  //       '\\end{enumerate}\n' +
  //       'bar'
  //     )
  //   })

  //   it('adds whitespace around numbered list if selection in middle of line',
  // function () {
  //     _cm.setValue('foo bar baz')
  //     // Select "bar"
  //     _cm.setSelection({ line: 0, ch: 4 }, { line: 0, ch: 7 })

  //     TextWrapping.wrapNumberedList()

  //     expect(_cm.getValue()).toEqual(
  //       'foo \n' + // Newline before list
  //       '\\begin{enumerate}\n' +
  //       '\\item bar\n' +
  //       '\\end{enumerate}\n' + // Newline after list
  //       ' baz'
  //     )
  //   })

  //   it('adds whitespace before numbered list if selection ends at end of
  // line', function () {
  //     _cm.setValue('foo bar')
  //     _cm.setSelection({ line: 0, ch: 4 }, { line: 0, ch: 7 })

  //     TextWrapping.wrapNumberedList()

  //     expect(_cm.getValue()).toEqual(
  //       'foo \n' +
  //       '\\begin{enumerate}\n' +
  //       '\\item bar\n' +
  //       '\\end{enumerate}'
  //     )
  //   })

  //   it('inserts a numbered list within a numbered list', function () {
  //     _cm.setValue(
  //       '\\begin{enumerate}\n' +
  //       '\\item a\n' +
  //       '\\end{enumerate}'
  //     )
  //     // Place cursor at end of the \item
  //     _cm.setCursor({ line: 1, ch: 7 })

  //     TextWrapping.wrapNumberedList()

  //     expect(_cm.getValue()).toEqual(
  //       '\\begin{enumerate}\n' +
  //       '\\item a\n' +
  //       '\\begin{enumerate}\n' +
  //       '\\item \n' +
  //       '\\end{enumerate}\n' +
  //       '\\end{enumerate}'
  //     )
  //     // Cursor should be at the end of the \item in the inner list
  //     expect(_cm.getCursor()).toEqual(CodeMirror.Pos(3, 6))
  //   })

  //   it('inserts a numbered list within a numbered list if cursor is before
  // \\end{}', function () {
  //     _cm.setValue(
  //       '\\begin{enumerate}\n' +
  //       '\\item a\n' +
  //       '\\end{enumerate}'
  //     )
  //     // Place cursor before \end{}
  //     _cm.setCursor({ line: 2, ch: 0 })

  //     TextWrapping.wrapNumberedList()

  //     expect(_cm.getValue()).toEqual(
  //       '\\begin{enumerate}\n' +
  //       '\\item a\n' +
  //       '\\begin{enumerate}\n' +
  //       '\\item \n' +
  //       '\\end{enumerate}\n' +
  //       '\\end{enumerate}'
  //     )
  //   })
  // })
})
