/* global sinon */

import fixture from '../../../../../../test/frontend/support/fixture'
import { stubMathJax, teardownMathJax } from '../support/stub_mathjax'
import { Editor } from '../../../../frontend/js/rich_text_editor'

const FIXTURE_HTML = '<div></div>'

const autocompleteAdapterStub = {
  getBeginCommandArguments: () => ['environmentName']
}

describe('RichText', function() {
  before(stubMathJax)
  after(teardownMathJax)

  beforeEach(function() {
    this.rtAdapter = {}
    this.editor = new Editor(
      fixture.load(FIXTURE_HTML),
      this.rtAdapter,
      autocompleteAdapterStub,
      {},
      sinon.stub()
    )
    this.cm = this.editor.getCodeMirror()
    this.editor.enable()
  })

  afterEach(function() {
    fixture.cleanUp()
    this.editor.disable()
  })

  it('formats a typed section heading', function() {
    this.cm.setValue('\\section{a')
    expect(this.cm.getAllMarks().length).to.equal(0)

    typeAtEnd(this.cm, '}')

    const marks = this.cm.getAllMarks()
    expect(marks.length).to.equal(3)
    expect(marks[0].wlValue).to.equal('\\section{')
    expect(marks[1].wlValue).to.equal(undefined) // dynamic mark
    expect(marks[2].wlValue).to.equal('}')
  })

  it('updates a typed section heading', function() {
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

  it('clears math mark in comment', function() {
    this.cm.setValue('Let $i$ be')
    expect(this.cm.getAllMarks().length).to.equal(1)

    typeAt(this.cm, 0, 0, '%')
    expect(this.cm.getAllMarks().length).to.equal(0)
  })

  it('clears text formatting in comment', function() {
    this.cm.setValue('foo \\textit{bar}')
    expect(this.cm.getAllMarks().length).to.equal(3)

    typeAt(this.cm, 0, 0, '%')
    expect(this.cm.getAllMarks().length).to.equal(0)
  })

  it('clears preamble line widget on setValue', function() {
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

  it('updates equation when changed remotely', function() {
    type(this.cm, '$a$\n')

    expect(this.cm.getAllMarks().length).to.equal(1)
    expect(this.cm.getAllMarks()[0].wlValue).to.equal('$a$')

    this.cm.replaceRange('b', { line: 0, ch: 1 }, { line: 0, ch: 2 })
    this.editor.update()

    expect(this.cm.getAllMarks().length).to.equal(1)
    expect(this.cm.getValue()).to.equal('$b$\n')
    expect(this.cm.getAllMarks()[0].wlValue).to.equal('$b$')
  })

  it('should ignore updates when disabled', function() {
    // regression: was not checking enabled/disabled on external update call
    this.editor.disable()
    type(this.cm, '\\section{test}\n')
    expect(this.cm.getAllMarks().length).to.equal(0)

    this.editor.update()
    expect(this.cm.getAllMarks().length).to.equal(0)
  })

  it('should handle adjacent math marks', function() {
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

  it('should handle empty inline formatting', function() {
    // regression: by default, codemirror 4 clears empty markers, so the empty
    // marker in an inline formatting was getting cleared; this then triggered
    // a bug in the marker matching on update
    type(this.cm, '\\textbf{}')
    expect(this.cm.getAllMarks().length).to.equal(3)

    this.editor.update()
    expect(this.cm.getAllMarks().length).to.equal(3)
  })

  it('should format a typed abstract', function() {
    this.cm.setValue('\\begin{abstract}\n Here be abstracts \n\\end{abstract')
    expect(this.cm.getAllMarks().length).to.equal(0)

    typeAtEnd(this.cm, '}')

    const marks = this.cm.getAllMarks()
    expect(marks.length).to.equal(3)
    expect(marks[0].wlValue).to.equal('\\begin{abstract}')
    expect(marks[2].wlValue).to.equal('\\end{abstract}')
  })

  it('should ignore a badly formatted abstract', function() {
    this.cm.setValue('\\begin{abstract} Here be abstracts \\end{abstract}')
    expect(this.cm.getAllMarks().length).to.equal(0)

    this.cm.setValue('\\begin{abstract}\n Here be abstracts \\end{abstract}')
    expect(this.cm.getAllMarks().length).to.equal(0)

    this.cm.setValue('\\begin{abstract} Here be abstracts \n\\end{abstract}')
    expect(this.cm.getAllMarks().length).to.equal(0)
  })

  it('should number nested lists', function() {
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

  it('should correctly indent items and enumerate environments', function() {
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

  it('should correctly indent line numbers', function() {
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

  it('should correctly indent items and itemize environments', function() {
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

  it('should update list numbers when removing an item from the middle', function() {
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

  it('should handle section tag becoming empty', function() {
    // regression: caused error due to mark clearing order
    this.cm.setValue('\\section{a}')

    expect(this.cm.getAllMarks().length).to.equal(3)

    this.editor.update()
    this.cm.replaceRange('', { line: 0, ch: 9 }, { line: 0, ch: 10 })

    expect(this.cm.getAllMarks().length).to.equal(0)
  })

  describe('Figures', function() {
    beforeEach(function() {
      this.rtAdapter.getEntityForPath = sinon.stub().returns({
        id: 'entity_id',
        name: 'watermelon-1600x1200.jpg'
      })
      this.rtAdapter.isPreviewableEntity = sinon.stub().returns(true)
      this.rtAdapter.getPreviewUrlForEntity = sinon
        .stub()
        .returns('/fake/project/project_id/file/entity_id')
    })

    it('should correctly show a figure environment', function() {
      this.cm.setValue(
        'a\n' +
          '\\begin{figure}\n' +
          '\\centering\n' +
          '\\includegraphics[width=0.3\\textwidth]' +
          '{watermelon-1600x1200.jpg}\n' +
          '\\end{figure}'
      )
      this.cm.setCursor({ line: 0, ch: 0 })

      const imgs = document.querySelectorAll('img')
      expect(imgs.length).to.equal(1)
      expect(imgs[0].className).to.equal('img-responsive wl-figure')
      expect(document.querySelector('.wl-figure-caption')).to.be.null
    })

    it('should correctly mark a figure environment', function() {
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

    it('should correctly show a figure environment with no file extension', function() {
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

    it('should correctly show a figure environment with multiple figures (being same)', function() {
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

    it('should correctly show a figure environment with multiple figures', function() {
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

    it('not replace figures when they overlap', function() {
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

    it('adds file name as figure name', function() {
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

    describe('image not found', function() {
      beforeEach(function() {
        // Stub previewUrl to be null
        this.rtAdapter.getEntityForPath = sinon.stub().returns(null)
      })

      it('should not show an image tag when the image is not found', function() {
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

    it('should show a caption in a figure environment', function() {
      this.cm.setValue(
        'a\n' +
          '\\begin{figure}\n' +
          '\\centering\n' +
          '\\includegraphics[width=0.3\\textwidth]{test}\n' +
          '\\caption{\\label{fig:frog}This frog was uploaded to Overleaf}\n' +
          '\\end{figure}\n' +
          'b'
      )

      expect(document.querySelector('.wl-figure-caption').textContent).to.equal(
        'fig:frogThis frog was uploaded to Overleaf'
      )
    })

    it('should correctly clear the mark when the cursor is inside a figure', function() {
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

  it('should handle square brackets preceding a command argument close brace', function() {
    type(this.cm, '\\title{Test Title]}\n')
    type(this.cm, '\\maketitle\n')
    expect(this.cm.getAllMarks().length).to.equal(1)
    expect(this.cm.lineInfo(0).widgets.length).to.equal(1)

    this.cm.setValue('new content')
    expect(this.cm.getAllMarks().length).to.equal(0)
    expect(this.cm.lineInfo(0).widgets).to.equal(undefined)
  })

  describe('Input', function() {
    it('should handle include with found file', function() {
      this.rtAdapter.fileExistsForPath = sinon.stub().returns(true)

      this.cm.setValue('\\input{foo/bar.tex}')

      var textMarks = this.cm.findMarks({ line: 0, ch: 0 }, { line: 0, ch: 8 })
      expect(textMarks[1].className).to.equal('wl-input')
      var icon = document.querySelector('.fa-link')
      expect(icon.style['border-bottom-color']).to.equal('rgb(28, 139, 34)')
    })

    it('should handle include with not found file', function() {
      this.rtAdapter.fileExistsForPath = sinon.stub().returns(false)

      this.cm.setValue('\\input{foo/bar.tex}')

      var textMarks = this.cm.findMarks({ line: 0, ch: 0 }, { line: 0, ch: 8 })
      expect(textMarks[1].className).to.equal('wl-input')
      var icon = document.querySelector('.fa-link')
      expect(icon.style['border-bottom-color']).to.equal('rgb(187, 17, 17)')
    })
  })
})

function type(cm, string) {
  cm.replaceRange(string, cm.getCursor(), cm.getCursor())
}

function typeAt(cm, line, ch, string) {
  cm.setCursor(line, ch)
  type(cm, string)
}

function typeAtEnd(cm, string) {
  const lastLine = cm.lineCount() - 1
  typeAt(cm, lastLine, cm.getLine(lastLine).length, string)
}
