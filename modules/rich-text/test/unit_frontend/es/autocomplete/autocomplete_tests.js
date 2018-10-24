/* global sinon */

import fixture from '../../../../../../test/unit_frontend/es/support/fixture'
import { Editor } from '../../../../public/es/index'

const FIXTURE_HTML = '<div></div>'

describe('Autocomplete', function () {
  beforeEach(function () {
    this.adapter = {
      getBeginCommandArguments: sinon.stub(),
      getCommandCompletions: sinon.stub().returns(
        makeCompletionsList(['\\foo', '\\bar'])
      )
    }

    this.editor = makeEditor(this.adapter)
    this.cm = this.editor.getCodeMirror()
  })

  afterEach(function () {
    fixture.cleanUp()
    this.editor.disable()
  })

  it('shows completions for single backslash', function () {
    const completions = makeCompletionsList(['\\foo', '\\bar'])
    this.adapter.getCommandCompletions = sinon.stub().returns(completions)
    type(this.cm, '\\')

    const { list, from, to } = getShownAutocomplete(this.cm)
    expect(list).to.equal(completions)
    expect(from.line).to.equal(0)
    expect(from.ch).to.equal(0)
    expect(to.line).to.equal(0)
    expect(to.ch).to.equal(1)
  })

  it('shows filtered completions when typing \\a', function () {
    const completions = makeCompletionsList(['\\aaa', '\\bbb'])
    this.adapter.getCommandCompletions = sinon.stub().returns(completions)
    type(this.cm, '\\a')

    const { list } = getShownAutocomplete(this.cm)
    expect(list).to.deep.equal(makeCompletionsList(['\\aaa']))
  })

  it('doesn\'t show if typed text doesn\'t match possible completions', function () {
    const completions = makeCompletionsList(['\\foo', '\\bar'])
    this.adapter.getCommandCompletions = sinon.stub().returns(completions)
    type(this.cm, '\\helloworld')

    const { list } = getShownAutocomplete(this.cm)
    expect(list).to.be.empty
  })

  it('doesn\'t show completions for backslash followed by a space', function () {
    type(this.cm, '\\ ')

    // Won't show autocomplete
    expect(getShownAutocomplete(this.cm)).to.be.undefined
  })

  it('shows completions for backslash then cursor then space', function () {
    const completions = makeCompletionsList(['\\foo', '\\bar'])
    this.adapter.getCommandCompletions = sinon.stub().returns(completions)
    type(this.cm, '\\ ')
    // Move cursor after backslash, with space ahead
    this.cm.setCursor({ line: 0, ch: 1 })

    // const completionData = this.autocomplete(this.cm)
    const { list } = getShownAutocomplete(this.cm)
    expect(list).to.equal(completions)
  })

  it('shows all completions for backslash after another command', function () {
    const completions = makeCompletionsList(['\\foo', '\\bar'])
    this.adapter.getCommandCompletions = sinon.stub().returns(completions)
    // \helloworld doesn't match any completions, but we type another backslash
    // so we should see all possible completions
    type(this.cm, '\\helloworld \\')

    const { list } = getShownAutocomplete(this.cm)
    expect(list).to.equal(completions)
  })

  it('shows \\begin environment argument completions', function () {
    // \begin argument completions are created when makeAutocomplete is called
    // so override this.adapter & this.cm with custom stubs
    this.adapter.getBeginCommandArguments = sinon.stub().returns(
      ['env1', 'env2']
    )
    this.editor = makeEditor(this.adapter)
    this.cm = this.editor.getCodeMirror()
    type(this.cm, '\\begin{}')
    // Move cursor into \begin argument
    this.cm.setCursor({ line: 0, ch: 7 })

    const { list } = getShownAutocomplete(this.cm)
    expect(list[0].text).to.equal('env1')
    expect(list[1].text).to.equal('env2')
  })

  it('doesn\'t show argument completions if there are no possible completions for the command', function () {
    type(this.cm, '\\section{}')
    // Move cursor into \section argument
    this.cm.setCursor({ line: 0, ch: 9 })

    const { list } = getShownAutocomplete(this.cm)
    expect(list).to.be.empty
  })

  it('shows \\cite reference argument completions', function () {
    const bibTexCompletions = ['ACitation', 'BCitation']
    this.adapter.getBibtexArguments = sinon.stub().returns({
      keys: bibTexCompletions
    })
    type(this.cm, '\\cite{}')
    // Move cursor into \cite argument
    this.cm.setCursor({ line: 0, ch: 6 })

    const { list } = getShownAutocomplete(this.cm)
    expect(list).to.deep.equal(
      makeCompletionsList(bibTexCompletions)
    )
  })

  it('shows \\cite reference argument completions after comma', function () {
    const bibTexCompletions = ['ACitation', 'BCitation']
    this.adapter.getBibtexArguments = sinon.stub().returns({
      keys: bibTexCompletions
    })
    type(this.cm, '\\cite{foo,}')
    // Move cursor into \cite argument, after comma
    this.cm.setCursor({ line: 0, ch: 10 })

    const { list } = getShownAutocomplete(this.cm)
    expect(list).to.deep.equal(
      makeCompletionsList(bibTexCompletions)
    )
  })

  it('shows \\cite reference argument completions before comma', function () {
    const bibTexCompletions = ['ACitation', 'BCitation']
    this.adapter.getBibtexArguments = sinon.stub().returns({
      keys: bibTexCompletions
    })
    type(this.cm, '\\cite{,foo}')
    // Move cursor into \cite argument, after comma
    this.cm.setCursor({ line: 0, ch: 6 })

    const { list } = getShownAutocomplete(this.cm)
    expect(list).to.deep.equal(
      makeCompletionsList(bibTexCompletions)
    )
  })

  it('shows \\ref label argument completions', function () {
    const referenceCompletions = ['ALabel', 'BLabel']
    this.adapter.getReferenceArguments = sinon.stub().returns(
      referenceCompletions
    )
    type(this.cm, '\\ref{}')
    // Move cursor into \ref argument
    this.cm.setCursor({ line: 0, ch: 5 })

    const { list } = getShownAutocomplete(this.cm)
    expect(list).to.deep.equal(
      makeCompletionsList(referenceCompletions)
    )
  })

  it('doesn\'t show if autocomplete setting is disabled', function () {
    const getSetting = sinon.stub().withArgs('autoComplete').returns(false)
    this.editor = makeEditor(this.adapter, getSetting)
    this.cm = this.editor.getCodeMirror()
    type(this.cm, '\\')

    // Won't show autocomplete
    expect(getShownAutocomplete(this.cm)).to.be.undefined
  })

  describe('when command picked', function () {
    it('inserts command', function () {
      // Return completion with handler function that is provided by
      // autocomplete
      this.adapter.getCommandCompletions = (handleCommandCompletionPicked) => {
        return ['\\foo', '\\bar'].map((command) => ({
          text: command,
          displayText: command,
          hint: handleCommandCompletionPicked
        }))
      }
      type(this.cm, '\\')

      const { list, from, to } = getShownAutocomplete(this.cm)
      const pickedCompletion = list[0]
      // Pick completion
      pickedCompletion.hint(this.cm, { from, to }, pickedCompletion)

      expect(this.cm.getValue()).to.equal('\\foo')
    })

    it('moves cursor to first set of arguments', function () {
      // Return completion with handler function that is provided by
      // autocomplete
      this.adapter.getCommandCompletions = (handleCommandCompletionPicked) => {
        return ['\\foo{}', '\\bar{}'].map((command) => ({
          text: command,
          displayText: command,
          hint: handleCommandCompletionPicked
        }))
      }
      type(this.cm, '\\')

      const { list, from, to } = getShownAutocomplete(this.cm)
      const pickedCompletion = list[0]
      // Pick completion
      pickedCompletion.hint(this.cm, { from, to }, pickedCompletion)

      // Expect cursor is inside \foo arguments
      const { line, ch } = this.cm.getCursor()
      expect(line).to.equal(0)
      expect(ch).to.equal(5)
    })

    it('inserts \\end for \\begin completion', function () {
      // Return \begin completion with handler function that is provided by
      // autocomplete
      this.adapter.getCommandCompletions = (handleCommandCompletionPicked) => {
        return [{
          text: '\\begin{}',
          displayText: '\\begin{}',
          hint: handleCommandCompletionPicked
        }]
      }
      type(this.cm, '\\')

      const { list, from, to } = getShownAutocomplete(this.cm)
      const pickedCompletion = list[0]
      // Pick completion
      pickedCompletion.hint(this.cm, { from, to }, pickedCompletion)

      expect(this.cm.getValue()).to.equal(
        '\\begin{}\n' +
        '\n' +
        '\\end{}'
      )
      // Expect cursor is inside \begin arguments
      const { line, ch } = this.cm.getCursor()
      expect(line).to.equal(0)
      expect(ch).to.equal(7)
    })

    it('handles proceeding whitespace for \\begin completion', function () {
      this.adapter.getCommandCompletions = (handleCommandCompletionPicked) => {
        return [{
          text: '\\begin{}',
          displayText: '\\begin{}',
          hint: handleCommandCompletionPicked
        }]
      }
      type(this.cm, '  \\')

      const { list, from, to } = getShownAutocomplete(this.cm)
      const pickedCompletion = list[0]
      // Pick completion
      pickedCompletion.hint(this.cm, { from, to }, pickedCompletion)

      expect(this.cm.getValue()).to.equal(
        '  \\begin{}\n' +
        '  \n' +
        '  \\end{}'
      )
    })
  })

  describe('when \\begin environment argument picked', function () {
    it('inserts argument', function () {
      // \begin argument completions are created when makeAutocomplete is called
      // so override this.adapter & this.cm with custom stubs
      this.adapter.getBeginCommandArguments = sinon.stub().returns(
        ['env1', 'env2']
      )
      this.editor = makeEditor(this.adapter)
      this.cm = this.editor.getCodeMirror()

      type(this.cm, '\\begin{}')
      // Move cursor into \begin argument
      this.cm.setCursor({ line: 0, ch: 7 })

      const { list, from, to } = getShownAutocomplete(this.cm)
      const pickedCompletion = list[0]
      // Pick completion
      pickedCompletion.hint(this.cm, { from, to }, pickedCompletion)

      expect(this.cm.getValue()).to.equal('\\begin{env1}')
    })

    it('inserts argument into matching \\end and inserts \\item', function () {
      // \begin argument completions are created when makeAutocomplete is called
      // so override this.adapter & this.cm with custom stubs
      this.adapter.getBeginCommandArguments = sinon.stub().returns(['itemize'])
      this.editor = makeEditor(this.adapter)
      this.cm = this.editor.getCodeMirror()

      this.cm.setValue(
        '\\begin{}\n' +
        '\n' +
        '\\end{}'
      )
      // Move cursor into \begin argument
      this.cm.setCursor({ line: 0, ch: 7 })

      const { list, from, to } = getShownAutocomplete(this.cm)
      const pickedCompletion = list[0]
      // Pick completion
      pickedCompletion.hint(this.cm, { from, to }, pickedCompletion)

      expect(this.cm.getValue()).to.equal(
        '\\begin{itemize}\n' +
        '\\item \n' +
        '\\end{itemize}'
      )
    })
  })
})

/**
 * Make a new instance of the Editor and configure with a given autocomplete
 * adapter
 */
function makeEditor (adapter, getSetting) {
  if (!getSetting) {
    getSetting = sinon.stub().withArgs('autoComplete').returns(true)
  }

  const editor = new Editor(
    fixture.load(FIXTURE_HTML),
    {},
    adapter,
    {},
    getSetting
  )
  editor.enable()

  return editor
}

/**
 * Emulate typing in CodeMirror instance
 */
function type (cm, string) {
  cm.replaceRange(string, cm.getCursor(), cm.getCursor())
}

/**
 * Map simple list of completions into autocomplete compatible list
 */
function makeCompletionsList (completions) {
  return completions.map((c) => ({
    text: c,
    displayText: c
  }))
}

/**
 * Look inside the autocomplete widget to get the data about the list of
 * completions that is shown and it's position
 */
function getShownAutocomplete (cm) {
  cm.showHint()

  if (!cm.state.completionActive) throw new Error('No autocomplete active')

  return cm.state.completionActive.data
}
