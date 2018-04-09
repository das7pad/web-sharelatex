define [
  'ide/rich-text/directives/cmEditor'
  'ide/rich-text/RichTextAdapter'
], (cmEditor, RichTextAdapter) ->
  describe 'cmEditor', () ->
    beforeEach module 'SharelatexApp', ($provide) ->
      $provide.factory 'ide', () ->
        { fileTreeManager: sinon.stub() }
      return

    origRequireJsFn = null
    beforeEach () ->
      origRequireJsFn = window.requirejs
      window.requirejs = @requirejs = sinon.stub()

    afterEach () ->
      window.Frontend = null
      window.requirejs = origRequireJsFn

    it 'inits Rich Text', () ->
      @requirejs.callsArgWith(1, {
        init: richTextInit = sinon.stub()
      })
      inject ($compile, $rootScope) ->
        $compile('<div cm-editor></div>')($rootScope)
        expect(richTextInit).to.have.been.called
        expect(richTextInit.firstCall.args[1]).to.be.an.instanceof(
          RichTextAdapter
        )

    it 'attaches to CM', () ->
      init = sinon.stub().returns({}) # Stub initing CM and returning instance
      openDoc = sinon.stub()
      enableRichText = sinon.stub()
      @requirejs.callsArgWith(1, {
        init: init
        openDoc: openDoc,
        enableRichText: enableRichText
      })
      inject ($compile, $rootScope, $browser) ->
        getSnapshot = sinon.stub()
        attachToCM = sinon.stub()
        $rootScope.sharejsDoc = {
          getSnapshot: getSnapshot
          attachToCM: attachToCM
        }

        $compile('<div cm-editor sharejs-doc="sharejsDoc"></div>')($rootScope)
        $rootScope.$digest()

        expect(getSnapshot).to.have.been.called
        expect(openDoc).to.have.been.called
        expect(attachToCM).to.have.been.called
        expect(enableRichText).to.have.been.called

    it 'detaches from CM when destroyed', () ->
      disableRichText = sinon.stub()
      @requirejs.callsArgWith(1, {
        init: sinon.stub().returns({})
        openDoc: sinon.stub()
        enableRichText: sinon.stub()
        disableRichText: disableRichText
      })
      inject ($compile, $rootScope) ->
        detachFromCM = sinon.stub()
        $rootScope.sharejsDoc = {
          detachFromCM: detachFromCM
          getSnapshot: sinon.stub()
          attachToCM: sinon.stub()
        }

        $compile('<div cm-editor sharejs-doc="sharejsDoc"></div>')($rootScope)
        $rootScope.$digest()
        $rootScope.$broadcast('destroy')

        expect(detachFromCM).to.have.been.called
        expect(disableRichText).to.have.been.called
