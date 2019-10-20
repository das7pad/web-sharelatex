/* eslint-disable
    max-len,
    no-return-assign,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS206: Consider reworking classes to avoid initClass
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
  'ide/rich-text/directives/cm_editor',
  'ide/rich-text/rich_text_adapter',
  'utils/EventEmitter'
], (cmEditor, RichTextAdapter, EventEmitter) => {
  let stubSharejsDoc
  describe('cmEditor', function() {
    beforeEach(
      module('SharelatexApp', $provide => {
        $provide.factory('ide', () => ({ fileTreeManager: sinon.stub() }))
        $provide.factory('metadata', () => ({}))
      })
    )

    it('inits Rich Text', function() {
      // Sinon doesn't really seem to like spying on a class, so we have to make
      // a custom one
      const editorStub = sinon.stub().returns({
        openDoc: sinon.stub(),
        enable: sinon.stub(),
        getCodeMirror: sinon.stub().returns({
          getValue: sinon.stub().returns('some text'),
          on: sinon.stub(),
          off: sinon.stub(),
          getWrapperElement: sinon.stub().returns({ off: sinon.stub() }),
          refresh: sinon.stub(),
          clearHistory: sinon.stub()
        }),
        disable: sinon.stub(),
        disableAutocomplete: sinon.stub()
      })
      return inject(($compile, $rootScope) => {
        $rootScope.sharejsDoc = stubSharejsDoc()
        $rootScope.bundle = { Editor: editorStub }
        $rootScope.formattingEvents = new EventEmitter()

        $compile(
          '<div cm-editor sharejs-doc="sharejsDoc" bundle="bundle" formatting-events="formattingEvents"></div>'
        )($rootScope)
        $rootScope.$digest()

        return expect(editorStub).to.have.been.called
      })
    })

    it('attaches to CM', function() {
      const Editor = stubEditor()
      const { getCodeMirror } = Editor.prototype
      const { openDoc } = Editor.prototype
      const { enable } = Editor.prototype
      return inject(($compile, $rootScope, $browser) => {
        let attachToCM, getSnapshot, snapshot
        $rootScope.sharejsDoc = stubSharejsDoc({
          getSnapshot: (getSnapshot = sinon.stub().returns((snapshot = {}))),
          attachToCM: (attachToCM = sinon.stub())
        })
        $rootScope.bundle = { Editor }
        $rootScope.formattingEvents = new EventEmitter()

        $compile(
          '<div cm-editor sharejs-doc="sharejsDoc" bundle="bundle" formatting-events="formattingEvents"></div>'
        )($rootScope)
        $rootScope.$digest()

        expect(getCodeMirror).to.have.been.called
        expect(getSnapshot).to.have.been.called
        expect(openDoc).to.have.been.called
        expect(openDoc.firstCall.args[0]).to.equal(snapshot)
        expect(attachToCM).to.have.been.called
        return expect(enable).to.have.been.called
      })
    })

    it('calls Editor.update when remoteop event is trigger', function() {
      const Editor = stubEditor()
      const { update } = Editor.prototype
      return inject(($compile, $rootScope) => {
        $rootScope.sharejsDoc = stubSharejsDoc()
        $rootScope.bundle = { Editor }
        $rootScope.formattingEvents = new EventEmitter()

        $compile(
          '<div cm-editor sharejs-doc="sharejsDoc" bundle="bundle" formatting-events="formattingEvents"></div>'
        )($rootScope)
        $rootScope.$digest()

        $rootScope.sharejsDoc.trigger('remoteop')
        return expect(update).to.have.been.called
      })
    })

    it('calls clearHistory when attaching to CM', function() {
      let clearHistory
      const Editor = stubEditor(
        stubCodeMirror({ clearHistory: (clearHistory = sinon.stub()) })
      )
      return inject(($compile, $rootScope) => {
        $rootScope.sharejsDoc = stubSharejsDoc()
        $rootScope.bundle = { Editor }
        $rootScope.formattingEvents = new EventEmitter()

        $compile(
          '<div cm-editor sharejs-doc="sharejsDoc" bundle="bundle" formatting-events="formattingEvents"></div>'
        )($rootScope)
        $rootScope.$digest()

        return expect(clearHistory).to.have.been.called
      })
    })

    return it('detaches from CM when destroyed', function() {
      const Editor = stubEditor()
      const { disable } = Editor.prototype
      return inject(($compile, $rootScope) => {
        let detachFromCM
        $rootScope.sharejsDoc = stubSharejsDoc({
          detachFromCM: (detachFromCM = sinon.stub())
        })
        $rootScope.bundle = { Editor }
        $rootScope.formattingEvents = new EventEmitter()

        $compile(
          '<div cm-editor sharejs-doc="sharejsDoc" bundle="bundle" formatting-events="formattingEvents"></div>'
        )($rootScope)
        $rootScope.$digest()
        $rootScope.$broadcast('$destroy')

        expect(detachFromCM).to.have.been.called
        return expect(disable).to.have.been.called
      })
    })
  })

  var stubCodeMirror = function(overrides) {
    // Should note that we're extending our EventEmitter implementation that
    // is different from CodeMirror's built-in implementation. However the top-
    // level api is the same
    if (overrides == null) {
      overrides = {}
    }
    return _.extend(
      EventEmitter.prototype,
      {
        getValue: sinon.stub().returns('some text'),
        getWrapperElement: sinon.stub().returns({ off: sinon.stub() }),
        refresh: sinon.stub(),
        clearHistory: sinon.stub()
      },
      overrides
    )
  }

  // Stub the Editor class that is returned as the root of the rich text bundle
  var stubEditor = function(codeMirror) {
    let Editor
    if (codeMirror == null) {
      codeMirror = stubCodeMirror()
    }
    return (Editor = (function() {
      Editor = class Editor {
        static initClass() {
          this.prototype.getCodeMirror = sinon.stub().returns(codeMirror)
          this.prototype.openDoc = sinon.stub()
          this.prototype.enable = sinon.stub()
          this.prototype.disable = sinon.stub()
          this.prototype.update = sinon.stub()
          this.prototype.disableAutocomplete = sinon.stub()
        }
      }
      Editor.initClass()
      return Editor
    })())
  }

  // Stub the ShareJS Doc that is created by editor internals
  return (stubSharejsDoc = function(overrides) {
    if (overrides == null) {
      overrides = {}
    }
    return _.extend(
      EventEmitter.prototype,
      {
        attachToCM: sinon.stub(),
        getSnapshot: sinon.stub(),
        detachFromCM: sinon.stub()
      },
      overrides
    )
  })
})
