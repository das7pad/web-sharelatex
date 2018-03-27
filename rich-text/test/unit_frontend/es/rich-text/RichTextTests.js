/* global sinon */

import CodeMirror from 'codemirror'

import fixture from '../support/fixture'
import { stubMathJax, teardownMathJax } from '../../support/stub-mathjax'
import LatexMode from 'Src/ide/editor/codemirror/LatexMode'
import RichText from 'Src/ide/editor/RichText'

const TEXTAREA_HTML = '<textarea></textarea>'

describe('RichText', function () {
  before(stubMathJax)
  after(teardownMathJax)

  beforeEach(function () {
    this.textarea = fixture.load(TEXTAREA_HTML)

    CodeMirror.defineMode('latex', () => new LatexMode())
    this.cm = CodeMirror.fromTextArea(this.textarea, {
      mode: 'latex'
    })

    this.rtAdapter = {}

    this.rt = new RichText(this.cm, this.rtAdapter)
    this.rt.enable()
  })

  afterEach(function () {
    fixture.cleanUp()
    this.rt.disable()
  })

  it('formats a typed section heading', function () {
    this.cm.setValue('\\section{a')
    expect(this.cm.getAllMarks().length).to.equal(0)

    typeAtEnd(this.cm, '}')

    const marks = this.cm.getAllMarks()
    expect(marks.length).to.equal(3)
    expect(marks[0].wlValue).to.equal('\\section{')
    expect(marks[1].wlValue).to.equal(undefined) // dynamic mark
    expect(marks[2].wlValue).to.equal('}')
  })

  it('updates a typed section heading', function () {
    this.cm.setValue('\\section{a}')

    expect(this.cm.getAllMarks().length).to.equal(3)

    let marks = this.cm.getAllMarks()
    expect(marks[0].wlValue).to.equal('\\section{')
    expect(marks[1].wlValue).to.equal(undefined) // dynamic mark
    expect(marks[2].wlValue).to.equal('}')

    typeAt(this.cm, 0, 10, 'b')
    marks = this.cm.getAllMarks()
    expect(marks.length).to.equal(3)
  })

  it('clears math mark in comment', function () {
    this.cm.setValue('Let $i$ be')
    expect(this.cm.getAllMarks().length).to.equal(1)

    typeAt(this.cm, 0, 0, '%')
    expect(this.cm.getAllMarks().length).to.equal(0)
  })

  it('clears text formatting in comment', function () {
    this.cm.setValue('foo \\textit{bar}')
    expect(this.cm.getAllMarks().length).to.equal(3)

    typeAt(this.cm, 0, 0, '%')
    expect(this.cm.getAllMarks().length).to.equal(0)
  })

  it('clears preamble line widget on setValue', function () {
    // if we reset the content of the editor, all of the marks are hidden, but
    // the line widgets remain unless we remember to explicitly clear them
    type(this.cm, '\\title{Test Title}\n')
    type(this.cm, '\\maketitle\n')
    expect(this.cm.getAllMarks().length).to.equal(1)
    expect(this.cm.lineInfo(0).widgets.length).to.equal(1)

    this.cm.setValue('new content')
    expect(this.cm.getAllMarks().length).to.equal(0)
    expect(this.cm.lineInfo(0).widgets).to.equal(undefined)
  })

  it('updates equation when changed remotely', function () {
    type(this.cm, '$a$\n')

    expect(this.cm.getAllMarks().length).to.equal(1)
    expect(this.cm.getAllMarks()[0].wlValue).to.equal('$a$')

    this.cm.replaceRange('b', { line: 0, ch: 1 }, { line: 0, ch: 2 })
    this.rt.update()

    expect(this.cm.getAllMarks().length).to.equal(1)
    expect(this.cm.getValue()).to.equal('$b$\n')
    expect(this.cm.getAllMarks()[0].wlValue).to.equal('$b$')
  })

  it('should ignore updates when disabled', function () {
    // regression: was not checking enabled/disabled on external update call
    this.rt.disable()
    type(this.cm, '\\section{test}\n')
    expect(this.cm.getAllMarks().length).to.equal(0)

    this.rt.update()
    expect(this.cm.getAllMarks().length).to.equal(0)
  })

  it('should handle adjacent math marks', function () {
    // regression: codemirror's handling of adjacent ranges with inclusiveLeft
    // or inclusiveRight set changed between 3.20 and 3.21. The workaround is
    // to not set inclusiveLeft or inclusiveRight on math. This is nicer for
    // inline math, but it does let you put the cursor to the left or right of a
    // displayed equation, which isn't ideal, but it's also not so bad.
    type(this.cm, '$x$\\textit{a}\n')
    expect(this.cm.getAllMarks().length).to.equal(4)

    type(this.cm, '$x$\\textit{a}$y$\n')
    expect(this.cm.getAllMarks().length).to.equal(9)

    type(this.cm, '$x$\\[a\\]\n')
    expect(this.cm.getAllMarks().length).to.equal(11)

    type(this.cm, '$x$\\[a\\]$y$\n')
    expect(this.cm.getAllMarks().length).to.equal(14)

    type(this.cm, '$x$\\(a\\)\n')
    expect(this.cm.getAllMarks().length).to.equal(16)
  })

  it('should handle empty inline formatting', function () {
    // regression: by default, codemirror 4 clears empty markers, so the empty
    // marker in an inline formatting was getting cleared; this then triggered
    // a bug in the marker matching on update
    type(this.cm, '\\textbf{}')
    expect(this.cm.getAllMarks().length).to.equal(3)

    this.rt.update()
    expect(this.cm.getAllMarks().length).to.equal(3)
  })

  it('should format a typed abstract', function () {
    this.cm.setValue('\\begin{abstract}\n Here be abstracts \n\\end{abstract')
    expect(this.cm.getAllMarks().length).to.equal(0)

    typeAtEnd(this.cm, '}')

    const marks = this.cm.getAllMarks()
    expect(marks.length).to.equal(3)
    expect(marks[0].wlValue).to.equal('\\begin{abstract}')
    expect(marks[2].wlValue).to.equal('\\end{abstract}')
  })

  it('should ignore a badly formatted abstract', function () {
    this.cm.setValue('\\begin{abstract} Here be abstracts \\end{abstract}')
    expect(this.cm.getAllMarks().length).to.equal(0)

    this.cm.setValue('\\begin{abstract}\n Here be abstracts \\end{abstract}')
    expect(this.cm.getAllMarks().length).to.equal(0)

    this.cm.setValue('\\begin{abstract} Here be abstracts \n\\end{abstract}')
    expect(this.cm.getAllMarks().length).to.equal(0)
  })

  it('should number nested lists', function () {
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

    const tokenAt4 = this.cm.getTokenAt({ line: 4, ch: 8 }, true)
    const marksAt4 = this.cm.findMarksAt({ line: 4, ch: 0 })
    const lastClosedMarkAt4 =
      tokenAt4.state.marks[tokenAt4.state.marks.length - 1]
    expect(tokenAt4.string).to.equal('FIRST')
    expect(tokenAt4.state.openMarks.length).to.equal(2)
    expect(lastClosedMarkAt4.checkedProperties.number).to.equal(1)
    expect(lastClosedMarkAt4.checkedProperties.openMarksCount).to.equal(1)
    expect(marksAt4[0].replacedWith.className).to.equal(
      'wl-enumerate-item-open'
    )

    const tokenAt6 = this.cm.getTokenAt({ line: 6, ch: 10 }, true)
    const marksAt6 = this.cm.findMarksAt({ line: 6, ch: 0 })
    const lastClosedMarkAt6 =
      tokenAt6.state.marks[tokenAt6.state.marks.length - 1]
    expect(tokenAt6.string).to.equal('THIRD')
    expect(tokenAt6.state.openMarks.length).to.equal(1)
    expect(lastClosedMarkAt6.checkedProperties.number).to.equal(3)
    expect(lastClosedMarkAt6.checkedProperties.openMarksCount).to.equal(0)
    expect(marksAt6[0].replacedWith.className).to.equal(
      'wl-enumerate-item-open'
    )
  })

  it('should correctly indent items and enumerate environments', function () {
    this.cm.setValue(
      '\\begin{enumerate}\n' +
      '\\item FIRST\n' +
      '\\item SECOND\n' +
      '\\begin{enumerate}\n' +
      '\\item FIRST\n' +
      '\\end{enumerate}\n' +
      '\\item THIRD\n' +
      '\\end{enumerate}\n' +
      'ABC-TEST'
    )

    expect(this.cm.lineInfo(0).textClass).to.equal('wl-indent-env-0')
    expect(this.cm.lineInfo(3).textClass).to.equal(
      'wl-indent-env-1 wl-indent-0'
    )
    expect(this.cm.lineInfo(4).textClass).to.equal('wl-indent-1 wl-indent-0')
    expect(this.cm.lineInfo(6).textClass).to.equal('wl-indent-0')
    expect(this.cm.lineInfo(7).textClass).to.equal('wl-indent-env-0')
    expect(this.cm.lineInfo(8).textClass).to.equal(undefined)
  })

  it('should correctly indent line numbers', function () {
    this.cm.setValue(
      '\\begin{enumerate}\n' +
      '\\item FIRST\n' +
      '\\item SECOND\n' +
      '\\begin{enumerate}\n' +
      '\\item FIRST\n' +
      '\\end{enumerate}\n' +
      '\\item THIRD\n' +
      '\\end{enumerate}\n' +
      'ABC-TEST'
    )

    const marksAt4 = this.cm.findMarksAt({ line: 4, ch: 0 })
    expect(marksAt4[0].replacedWith.outerHTML).to.include('margin-left: -1.5em')
  })

  it('should correctly indent items and itemize environments', function () {
    this.cm.setValue(
      '\\begin{itemize}\n' +
      '\\item FIRST\n' +
      '\\item SECOND\n' +
      '\\begin{itemize}\n' +
      '\\item FIRST\n' +
      '\\end{itemize}\n' +
      '\\item THIRD\n' +
      '\\end{itemize}\n' +
      'ABC-TEST'
    )

    expect(this.cm.lineInfo(0).textClass).to.equal('wl-indent-env-0')
    expect(this.cm.lineInfo(3).textClass).to.equal(
      'wl-indent-env-1 wl-indent-0'
    )
    expect(this.cm.lineInfo(4).textClass).to.equal('wl-indent-1 wl-indent-0')
    expect(this.cm.lineInfo(6).textClass).to.equal('wl-indent-0')
    expect(this.cm.lineInfo(7).textClass).to.equal('wl-indent-env-0')
    expect(this.cm.lineInfo(8).textClass).to.equal(undefined)
  })

  it('should update list numbers when removing an item from the middle', function () {
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
    this.cm.doc.replaceRange('', { line: 2, ch: 0 }, { line: 2, ch: 14 })

    const tokenAt4 = this.cm.getTokenAt({ line: 4, ch: 8 }, true)
    const marksAt4 = this.cm.findMarksAt({ line: 4, ch: 0 })
    const lastClosedMarkAt4 =
      tokenAt4.state.marks[tokenAt4.state.marks.length - 1]
    expect(tokenAt4.string).to.equal('FIRST')
    expect(tokenAt4.state.openMarks.length).to.equal(2)
    expect(lastClosedMarkAt4.checkedProperties.number).to.equal(1)
    expect(marksAt4[0].replacedWith.className).to.equal(
      'wl-enumerate-item-open'
    )

    const tokenAt6 = this.cm.getTokenAt({ line: 6, ch: 10 }, true)
    const marksAt6 = this.cm.findMarksAt({ line: 6, ch: 0 })
    const lastClosedMarkAt6 =
      tokenAt6.state.marks[tokenAt6.state.marks.length - 1]
    expect(tokenAt6.string).to.equal('THIRD')
    expect(tokenAt6.state.openMarks.length).to.equal(1)
    expect(lastClosedMarkAt6.checkedProperties.number).to.equal(2)
    expect(marksAt6[0].replacedWith.className).to.equal(
      'wl-enumerate-item-open'
    )
  })

  // it('should go up a line when inside an empty list', function (done) {
  //   this.cm.setValue(
  //     '\n' +
  //     '\\begin{itemize}\n' +
  //     '\\item a\n' +
  //     '\\item b\n' +
  //     '\\item c\n' +
  //     '\\end{itemize}'
  //   )
  //   this.cm.setCursor({ line: 4, ch: 7 })

  //   setTimeout(() => {
  //     this.cm.refresh()
  //     fakeNamedKey(this.cm, 'Up')
  //     expectCursorAt(this.cm, 3, 7)
  //     fakeNamedKey(this.cm, 'Up')
  //     expectCursorAt(this.cm, 2, 7)
  //     fakeNamedKey(this.cm, 'Up')
  //     expectCursorAt(this.cm, 0, 0)
  //     done()
  //   }, 1000)
  // })

  it('should handle section tag becoming empty', function () {
    // regression: caused error due to mark clearing order
    this.cm.setValue('\\section{a}')

    expect(this.cm.getAllMarks().length).to.equal(3)

    this.rt.update()
    this.cm.replaceRange('', { line: 0, ch: 9 }, { line: 0, ch: 10 })

    expect(this.cm.getAllMarks().length).to.equal(0)
  })

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

  // it('should place the first item before begin pressing backspace',
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
  //   this.cm.setCursor({ line: 1, ch: 6 })

  //   fakeNamedKey(this.cm, 'Backspace')
  //   expect(this.cm.getLine(0)).to.equal('FIRST')
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

  // it('should be able to delete a character immediately after a section',
  // function () {
  //   this.cm.setValue(
  //     '\\section{foo\n' +
  //     '}\n' +
  //     'x'
  //   )

  //   var linesBeforeDelete = this.cm.getValue().split('\n')
  //   expect(linesBeforeDelete).to.equal(['\\section{foo', '}', 'x'])
  //   this.cm.setCursor({ line: 2, ch: 1 })
  //   fakeNamedKey(this, 'Backspace')
  //   var linesAfterDelete = this.cm.getValue().split('\n')
  //   expect(linesAfterDelete).to.equal(['\\section{foo', '}', ''])
  // })

  // it('should do nothing pressing delete before begin', function () {
  //   this.cm.setValue(
  //     '\n' +
  //     '\\begin{enumerate}\n' +
  //     '\\item FIRST\n' +
  //     '\\item SECOND\n' +
  //     '\\begin{enumerate}\n' +
  //     '\\item h\n' +
  //     '\\end{enumerate}\n' +
  //     '\\item THIRD\n' +
  //     '\\end{enumerate}'
  //   )
  //   this.cm.setCursor({ line: 0, ch: 0 })

  //   fakeNamedKey(this.cm, 'Delete')
  //   expect(this.cm.getLine(0)).to.equal('')
  //   expect(this.cm.getLine(1)).to.equal('\\begin{enumerate}')
  // })

  // it('should do nothing pressing delete before end', function () {
  //   this.cm.setValue(
  //     '\n' +
  //     '\\begin{enumerate}\n' +
  //     '\\item FIRST\n' +
  //     '\\item SECOND\n' +
  //     '\\begin{enumerate}\n' +
  //     '\\item h\n' +
  //     '\\end{enumerate}\n' +
  //     '\\item THIRD\n' +
  //     '\\end{enumerate}'
  //   )
  //   this.cm.setCursor({ line: 5, ch: 9 })
  //   fakeNamedKey(this.cm, 'Delete')

  //   expect(this.cm.getLine(5)).to.equal('\\item h')
  //   expect(this.cm.getLine(6)).to.equal('\\end{enumerate}')
  // })

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

  describe('Figures', function () {
    beforeEach(function () {
      this.rtAdapter.getPreviewUrlForPath = sinon.stub().returns(
        '/fake/project/project_id/file/entity_id'
      )
    })

    it('should correctly show a figure environment', function () {
      this.cm.setValue(
        'a\n' +
        '\\begin{figure}\n' +
        '\\centering\n' +
        '\\includegraphics[width=0.3\\textwidth]{watermelon-1600x1200.jpg}\n' +
        '\\end{figure}'
      )
      this.cm.setCursor({ line: 0, ch: 0 })

      const imgs = document.querySelectorAll('img')
      expect(imgs.length).to.equal(1)
      expect(imgs[0].className).to.equal('img-responsive wl-figure')
      expect(document.querySelector('.wl-figure-caption')).to.be.null
    })

    it('should correctly mark a figure environment', function () {
      this.cm.setValue(
        'a\n' +
        '\\begin{figure}\n' +
        '\\centering\n' +
        '\\includegraphics[width=0.3\\textwidth]{test}\n' +
        '\\end{figure}'
      )

      const marks = this.cm.findMarksAt({ line: 4, ch: 0 })
      expect(marks[0].wlRegion).to.equal('outer')
      expect(marks[0].replacedWith.className).to.equal('wl-figure-wrap')
      expect(marks[0].replacedWith.nodeName).to.equal('DIV')
    })

    it('should correctly show a figure environment with no file extension', function () {
      this.cm.setValue(
        'a\n' +
        '\\begin{figure}\n' +
        '\\centering\n' +
        '\\includegraphics[width=0.3\\textwidth]{watermelon-1600x1200}\n' +
        '\\end{figure}'
      )
      this.cm.setCursor({ line: 0, ch: 0 })

      const imgs = document.querySelectorAll('img')
      expect(imgs.length).to.equal(1)
      expect(imgs[0].className).to.equal('img-responsive wl-figure')
      expect(document.querySelector('.wl-figure-caption')).to.be.null
    })

    it('should correctly show a figure environment with multiple figures (being same)', function () {
      this.cm.setValue(
        'a\n' +
        '\\begin{figure}\n' +
        '\\centering\n' +
        '\\includegraphics[width=0.3\\textwidth]{watermelon-1600x1200}\n' +
        '\\includegraphics[width=0.3\\textwidth]{watermelon-1600x1200}\n' +
        '\\caption{\\label{fig:frog}This frog was uploaded to Overleaf}\n' +
        '\\caption{\\label{fig:frog}This frog was uploaded to ShareLaTeX}\n' +
        '\\end{figure}'
      )
      this.cm.setCursor({ line: 0, ch: 0 })

      const imgs = document.querySelectorAll('img')
      expect(imgs.length).to.equal(2)
      expect(imgs[0].className).to.equal('img-responsive wl-figure')
      expect(imgs[1].className).to.equal('img-responsive wl-figure')
      expect(document.querySelectorAll('.wl-figure-caption').length).to.equal(2)
    })

    it('should correctly show a figure environment with multiple figures', function () {
      this.cm.setValue(
        'a\n' +
        '\\begin{figure}\n' +
        '\\centering\n' +
        '\\includegraphics[width=0.3\\textwidth]{example}\n' +
        '\\includegraphics[width=0.3\\textwidth]{example-1x1}\n' +
        '\\caption{\\label{fig:frog}This frog was uploaded to Overleaf}\n' +
        '\\caption{\\label{fig:frog}This frog was uploaded to ShareLaTeX}\n' +
        '\\end{figure}'
      )
      this.cm.setCursor({ line: 0, ch: 0 })

      const imgs = document.querySelectorAll('img')
      expect(imgs.length).to.equal(2)
      expect(imgs[0].className).to.equal('img-responsive wl-figure')
      expect(imgs[1].className).to.equal('img-responsive wl-figure')
      expect(document.querySelectorAll('.wl-figure-caption').length).to.equal(2)
    })

    it('not replace figures when they overlap', function () {
      this.cm.setValue(
        'a\n' +
        '\\begin{figure}\n' +
        '\\includegraphics{first}\n' +
        '\\end{figure}\\begin{figure}\n' +
        '\\includegraphics{second}\n' +
        '\\end{figure}\n'
      )
      this.cm.setCursor({ line: 0, ch: 0 })

      expect(document.querySelectorAll('img').length).to.equal(0)
    })

    it('adds file name as figure name', function () {
      this.cm.setValue(
        'a\n' +
        '\\begin{figure}\n' +
        '\\centering\n' +
        '\\includegraphics[width=0.3\\textwidth]{watermelon-1600x1200}\n' +
        '\\caption{\\label{fig:frog}This frog was uploaded to Overleaf}\n' +
        '\\end{figure}'
      )
      this.cm.setCursor({ line: 0, ch: 0 })

      const figureName = document.querySelectorAll('.wl-figure-name')
      expect(figureName.length).to.equal(1)
      // Wrap with [ and ]
      expect(figureName[0].textContent).to.equal('[watermelon-1600x1200]')
    })

    describe('image not found', function () {
      beforeEach(function () {
        // Stub previewUrl to be null
        this.rtAdapter.getPreviewUrlForPath = sinon.stub().returns(null)
      })

      it('should not show an image tag when the image is not found', function () {
        this.cm.setValue(
          'a\n' +
          '\\begin{figure}\n' +
          '\\centering\n' +
          '\\includegraphics[width=0.3\\textwidth]{watermelon-1600x1200}\n' +
          '\\end{figure}'
        )
        this.cm.setCursor({ line: 0, ch: 0 })

        const imgs = document.querySelectorAll('img')
        const notFoundMsg = document.querySelector('.wl-figure-not-found')
        expect(imgs.length).to.equal(0)
        expect(notFoundMsg.textContent).to.equal(
          '[Not Found: watermelon-1600x1200]'
        )
      })
    })

    it('should show a caption in a figure environment', function () {
      this.cm.setValue(
        'a\n' +
        '\\begin{figure}\n' +
        '\\centering\n' +
        '\\includegraphics[width=0.3\\textwidth]{test}\n' +
        '\\caption{\\label{fig:frog}This frog was uploaded to Overleaf}\n' +
        '\\end{figure}\n' +
        'b'
      )

      expect(document.querySelector('.wl-figure-caption').textContent)
        .to.equal('fig:frogThis frog was uploaded to Overleaf')
    })

    it('should correctly clear the mark when the cursor is inside a figure', function () {
      this.cm.setValue(
        'a\n' +
        '\\begin{figure}\n' +
        '\\centering\n' +
        '\\includegraphics[width=0.3\\textwidth]{test}\n' +
        '\\end{figure}'
      )
      this.cm.setCursor({ line: 1, ch: 0 })

      const marks = this.cm.findMarksAt({ line: 4, ch: 0 })
      expect(marks.length).to.equal(0)
    })
  })

  // it('should go back one line before section, if that line is blank',
  // function () {
  //   this.cm.setValue('\n\\section{a}')
  //   this.cm.setCursor({ line: 1, ch: 9 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(0)).to.equal('\\section{a}')
  // })

  // it('should place cursor back one line, if the line before is not empty',
  // function () {
  //   this.cm.setValue('abc\n\\section{a}')
  //   this.cm.setCursor({ line: 1, ch: 9 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(0)).to.equal('abc')
  //   expectCursorAt(this.cm, 0, 3)
  // })

  // it('should place cursor in the section, after pressing backspace at the
  // line after (with contents)', function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     '\\section{a}\n' +
  //     'aaa'
  //   )
  //   this.cm.setCursor({ line: 2, ch: 0 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('\\section{a}')
  //   expectCursorAt(this.cm, 1, 10)
  // })

  // it('should place cursor in the section and remove the ling, after pressing
  // backspace at the line after (without contents)', function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     '\\section{a}\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 2, ch: 0 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('\\section{a}')
  //   expectCursorAt(this.cm, 1, 10)
  //   expect(this.cm.getLine(2)).to.equal('b')
  // })

  // it('should delete an abstract if empty', function () {
  //   this.cm.setValue(
  //     '\\begin{abstract}\n' +
  //     '\n' +
  //     '\\end{abstract}'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 0 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(0)).to.equal('')
  // })

  // it('should skip when pressing before an abstract', function () {
  //   this.cm.setValue('aa\n\\begin{abstract}\n\n\\end{abstract}')
  //   this.cm.setCursor({ line: 0, ch: 2 })
  //   fakeNamedKey(this.cm, 'Delete')

  //   expect(this.cm.getLine(0)).to.equal('aa')
  //   expectCursorAt(this.cm, 2, 0)
  // })

  // it('should skip when pressing backspace after an abstract', function () {
  //   this.cm.setValue(
  //     '\\begin{abstract}\n' +
  //     '\n' +
  //     '\\end{abstract}\n' +
  //     'aa'
  //   )
  //   this.cm.setCursor({ line: 3, ch: 0 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(3)).to.equal('aa')
  //   expectCursorAt(this.cm, 1, 0)
  // })

  // it('should delete an abstract if empty (with delete key)', function () {
  //   this.cm.setValue(
  //     '\\begin{abstract}\n' +
  //     '\n' +
  //     '\\end{abstract}'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 0 })
  //   fakeNamedKey(this.cm, 'Delete')

  //   expect(this.cm.getLine(0)).to.equal('')
  // })

  // it('should delete a section command if empty', function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     '\\section{}\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 9 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('')
  //   expectCursorAt(this.cm, 1, 0)
  // })

  // it('should delete a section command if empty and surrounded by text',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'te\\section{}xt\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 11 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('text')
  //   expectCursorAt(this.cm, 1, 2)
  // })

  // it('should not delete the bracket after a section command if empty',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     '\\section{}\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 10 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('\\section{}')
  //   expectCursorAt(this.cm, 1, 9)
  // })

  // it('should delete the text before the section pressing backspace',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'tex\\section{section}\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 12 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('te\\section{section}')
  //   expectCursorAt(this.cm, 1, 11)
  // })

  // it('should do nothing pressing delete at the end of a section',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'tex\\section{section}abc\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 19 })
  //   fakeNamedKey(this.cm, 'Delete')

  //   expect(this.cm.getLine(1)).to.equal('tex\\section{section}abc')
  // })

  // it('should do nothing pressing backspace at the end of a section',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'tex\\section{section}abc\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 19 })
  //   fakeNamedKey(this.cm, 'Delete')

  //   expect(this.cm.getLine(1)).to.equal('tex\\section{section}abc')
  // })

  // it('should delete a subsection command if empty', function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     '\\subsection{}\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 12 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('')
  //   expectCursorAt(this.cm, 1, 0)
  // })

  // it('should delete a subsection command if empty and surrounded by text',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'te\\subsection{}xt\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 14 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('text')
  //   expectCursorAt(this.cm, 1, 2)
  // })

  // it('should not delete the bracket after a subsection command if empty',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     '\\subsection{}\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 13 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('\\subsection{}')
  //   expectCursorAt(this.cm, 1, 12)
  // })

  // it('should delete the text before the subsection pressing backspace',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'tex\\subsection{subsection}\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 15 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('te\\subsection{subsection}')
  //   expectCursorAt(this.cm, 1, 14)
  // })

  // it('should do nothing pressing delete at the end of a subsection',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'tex\\subsection{subsection}abc\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 25 })
  //   fakeNamedKey(this.cm, 'Delete')

  //   expect(this.cm.getLine(1)).to.equal('tex\\subsection{subsection}abc')
  // })

  // it('should do nothing pressing backspace at the end of a subsection',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'tex\\subsection{subsection}abc\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 25 })
  //   fakeNamedKey(this.cm, 'Delete')

  //   expect(this.cm.getLine(1)).to.equal('tex\\subsection{subsection}abc')
  // })

  // it('should delete a subsubsection command if empty', function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     '\\subsubsection{}\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 15 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('')
  //   expectCursorAt(this.cm, 1, 0)
  // })

  // it('should delete a subsubsection command if empty and surrounded by text',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'te\\subsubsection{}xt\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 17 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('text')
  //   expectCursorAt(this.cm, 1, 2)
  // })

  // it('should not delete the bracket after a subsubsection command if empty',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     '\\subsubsection{}\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 16 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('\\subsubsection{}')
  //   expectCursorAt(this.cm, 1, 15)
  // })

  // it('should delete the text before the subsubsection pressing backspace',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'tex\\subsubsection{subsubsection}\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 18 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('te\\subsubsection{subsubsection}')
  //   expectCursorAt(this.cm, 1, 17)
  // })

  // it('should do nothing pressing delete at the end of a subsubsection',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'tex\\subsubsection{subsubsection}abc\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 31 })
  //   fakeNamedKey(this.cm, 'Delete')

  //   expect(this.cm.getLine(1)).to.equal(
  //     'tex\\subsubsection{subsubsection}abc'
  //   )
  // })

  // it('should do nothing pressing backspace at the end of a subsubsection',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'tex\\subsubsection{subsubsection}abc\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 32 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal(
  //     'tex\\subsubsection{subsubsection}abc'
  //   )
  // })

  // it('should delete a chapter command if empty', function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     '\\chapter{}\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 9 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('')
  //   expectCursorAt(this.cm, 1, 0)
  // })

  // it('should delete a chapter command if empty and surrounded by text',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'te\\chapter{}xt\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 11 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('text')
  //   expectCursorAt(this.cm, 1, 2)
  // })

  // it('should not delete the bracket after a chapter command if empty',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     '\\chapter{}\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 10 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('\\chapter{}')
  //   expectCursorAt(this.cm, 1, 9)
  // })

  // it('should delete the text before the chapter pressing backspace',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'tex\\chapter{chapter}\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 12 })
  //   fakeNamedKey(this.cm, 'Backspace')

  //   expect(this.cm.getLine(1)).to.equal('te\\chapter{chapter}')
  //   expectCursorAt(this.cm, 1, 11)
  // })

  // it('should do nothing pressing delete at the end of a chapter',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'tex\\chapter{chapter}abc\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 19 })
  //   fakeNamedKey(this.cm, 'Delete')

  //   expect(this.cm.getLine(1)).to.equal('tex\\chapter{chapter}abc')
  // })

  // it('should do nothing pressing backspace at the end of a chapter',
  // function () {
  //   this.cm.setValue(
  //     'abc\n' +
  //     'tex\\chapter{chapter}abc\n' +
  //     'b\n'
  //   )
  //   this.cm.setCursor({ line: 1, ch: 19 })
  //   fakeNamedKey(this.cm, 'Delete')

  //   expect(this.cm.getLine(1)).to.equal('tex\\chapter{chapter}abc')
  // })

  it('should handle square brackets preceding a command argument close brace', function () {
    type(this.cm, '\\title{Test Title]}\n')
    type(this.cm, '\\maketitle\n')
    expect(this.cm.getAllMarks().length).to.equal(1)
    expect(this.cm.lineInfo(0).widgets.length).to.equal(1)

    this.cm.setValue('new content')
    expect(this.cm.getAllMarks().length).to.equal(0)
    expect(this.cm.lineInfo(0).widgets).to.equal(undefined)
  })

  describe('Input', function () {
    it('should handle include with found file', function () {
      this.rtAdapter.fileExistsForPath = sinon.stub().returns(true)

      this.cm.setValue('\\input{foo/bar.tex}')

      var textMarks = this.cm.findMarks({ line: 0, ch: 0 }, { line: 0, ch: 8 })
      expect(textMarks[1].className).to.equal('wl-input')
      var icon = document.querySelector('.fa-link')
      expect(icon.style['border-bottom-color']).to.equal('rgb(28, 139, 34)')
    })

    it('should handle include with not found file', function () {
      this.rtAdapter.fileExistsForPath = sinon.stub().returns(false)

      this.cm.setValue('\\input{foo/bar.tex}')

      var textMarks = this.cm.findMarks({ line: 0, ch: 0 }, { line: 0, ch: 8 })
      expect(textMarks[1].className).to.equal('wl-input')
      var icon = document.querySelector('.fa-link')
      expect(icon.style['border-bottom-color']).to.equal('rgb(187, 17, 17)')
    })
  })
})

function expectCursorAt (cm, line, ch) {
  // In CodeMirror 5.11, getCursor sometimes returns an object with an xRel
  // property, which we ignore for the purpose of this comparison.
  // In CodeMirror 5.27.4, getCursor is inconsistent in whether it returns a
  // Pos typed object or a plain Object. Therefore we just compare the line
  // and ch values
  var cursor = cm.getCursor()
  expect(cursor.line).to.equal(line)
  expect(cursor.ch).to.equal(ch)
}

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
    if (CodeMirror.keyNames[c] === key) { code = c; break }
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

function type (cm, string) {
  cm.replaceRange(string, cm.getCursor(), cm.getCursor())
}

function typeAt (cm, line, ch, string) {
  cm.setCursor(line, ch)
  type(cm, string)
}

function typeAtEnd (cm, string) {
  const lastLine = cm.lineCount() - 1
  typeAt(cm, lastLine, cm.getLine(lastLine).length, string)
}
