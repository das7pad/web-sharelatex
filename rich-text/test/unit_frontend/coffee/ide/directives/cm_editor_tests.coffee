define [
  'ide/rich-text/directives/cm_editor'
  'ide/rich-text/rich_text_adapter'
  'utils/EventEmitter'
], (cmEditor, RichTextAdapter, EventEmitter) ->
  describe 'cmEditor', () ->
    beforeEach module 'SharelatexApp', ($provide) ->
      $provide.factory 'ide', () ->
        { fileTreeManager: sinon.stub() }
      $provide.factory 'metadata', () -> {}
      return

    it 'inits Rich Text', () ->
      # Sinon doesn't really seem to like spying on a class, so we have to make
      # a custom one
      editorStub = sinon.stub().returns({
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
        disable: sinon.stub()
        disableAutocomplete: sinon.stub()
      })
      inject ($compile, $rootScope) ->
        $rootScope.sharejsDoc = stubSharejsDoc()
        $rootScope.bundle = { Editor: editorStub }
        $rootScope.formattingEvents = new EventEmitter()

        $compile('<div cm-editor sharejs-doc="sharejsDoc" bundle="bundle" formatting-events="formattingEvents"></div>')($rootScope)
        $rootScope.$digest()

        expect(editorStub).to.have.been.called

    it 'attaches to CM', () ->
      Editor = stubEditor()
      getCodeMirror = Editor.prototype.getCodeMirror
      openDoc = Editor.prototype.openDoc
      enable = Editor.prototype.enable
      inject ($compile, $rootScope, $browser) ->
        $rootScope.sharejsDoc = stubSharejsDoc({
          getSnapshot: getSnapshot = sinon.stub().returns(snapshot = {})
          attachToCM: attachToCM = sinon.stub()
        })
        $rootScope.bundle = { Editor: Editor }
        $rootScope.formattingEvents = new EventEmitter()

        $compile('<div cm-editor sharejs-doc="sharejsDoc" bundle="bundle" formatting-events="formattingEvents"></div>')($rootScope)
        $rootScope.$digest()

        expect(getCodeMirror).to.have.been.called
        expect(getSnapshot).to.have.been.called
        expect(openDoc).to.have.been.called
        expect(openDoc.firstCall.args[0]).to.equal(snapshot)
        expect(attachToCM).to.have.been.called
        expect(enable).to.have.been.called

    it 'calls Editor.update when remoteop event is trigger', () ->
      Editor = stubEditor()
      update = Editor.prototype.update
      inject ($compile, $rootScope) ->
        $rootScope.sharejsDoc = stubSharejsDoc()
        $rootScope.bundle = { Editor: Editor }
        $rootScope.formattingEvents = new EventEmitter()

        $compile('<div cm-editor sharejs-doc="sharejsDoc" bundle="bundle" formatting-events="formattingEvents"></div>')($rootScope)
        $rootScope.$digest()

        $rootScope.sharejsDoc.trigger('remoteop')
        expect(update).to.have.been.called

    it 'calls clearHistory when attaching to CM', () ->
      Editor = stubEditor(
        stubCodeMirror({ clearHistory: clearHistory = sinon.stub() })
      )
      inject ($compile, $rootScope) ->
        $rootScope.sharejsDoc = stubSharejsDoc()
        $rootScope.bundle = { Editor: Editor }
        $rootScope.formattingEvents = new EventEmitter()

        $compile('<div cm-editor sharejs-doc="sharejsDoc" bundle="bundle" formatting-events="formattingEvents"></div>')($rootScope)
        $rootScope.$digest()

        expect(clearHistory).to.have.been.called

    it 'detaches from CM when destroyed', () ->
      Editor = stubEditor()
      disable = Editor.prototype.disable
      inject ($compile, $rootScope) ->
        $rootScope.sharejsDoc = stubSharejsDoc({
          detachFromCM: detachFromCM = sinon.stub()
        })
        $rootScope.bundle = { Editor: Editor }
        $rootScope.formattingEvents = new EventEmitter()

        $compile('<div cm-editor sharejs-doc="sharejsDoc" bundle="bundle" formatting-events="formattingEvents"></div>')($rootScope)
        $rootScope.$digest()
        $rootScope.$broadcast('$destroy')

        expect(detachFromCM).to.have.been.called
        expect(disable).to.have.been.called

  stubCodeMirror = (overrides = {}) ->
    # Should note that we're extending our EventEmitter implementation that
    # is different from CodeMirror's built-in implementation. However the top-
    # level api is the same
    _.extend({
      getValue: sinon.stub().returns('some text'),
      getWrapperElement: sinon.stub().returns({ off: sinon.stub() }),
      refresh: sinon.stub(),
      clearHistory: sinon.stub()
    }, overrides, EventEmitter.prototype)

  # Stub the Editor class that is returned as the root of the rich text bundle
  stubEditor = (codeMirror = stubCodeMirror()) ->
    class Editor
      getCodeMirror: sinon.stub().returns(codeMirror)
      openDoc: sinon.stub()
      enable: sinon.stub()
      disable: sinon.stub()
      update: sinon.stub()
      disableAutocomplete: sinon.stub()

  # Stub the ShareJS Doc that is created by editor internals
  stubSharejsDoc = (overrides = {}) ->
    _.extend({
      attachToCM: sinon.stub()
      getSnapshot: sinon.stub()
      detachFromCM: sinon.stub()
    }, overrides, EventEmitter.prototype)
