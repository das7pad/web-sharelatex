define [
  'ide/rich-text/directives/cm_editor'
  'ide/rich-text/rich_text_adapter'
  'utils/EventEmitter'
], (cmEditor, RichTextAdapter, EventEmitter) ->
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
      window.requirejs = origRequireJsFn

    it 'inits Rich Text', () ->
      @requirejs.callsArgWith(1, stubRichText({
        init: richTextInit = sinon.stub()
      }))
      inject ($compile, $rootScope) ->
        $rootScope.sharejsDoc = stubSharejsDoc()
        $compile('<div cm-editor sharejs-doc="sharejsDoc"></div>')($rootScope)
        expect(richTextInit).to.have.been.called

    it 'attaches to CM', () ->
      init = sinon.stub().returns(cm = {}) # Stub initing CM and returning instance
      @requirejs.callsArgWith(1, stubRichText({
        init: init
        openDoc: openDoc = sinon.stub()
        enableRichText: enableRichText = sinon.stub()
      }))
      inject ($compile, $rootScope, $browser) ->
        $rootScope.sharejsDoc = stubSharejsDoc({
          getSnapshot: getSnapshot = sinon.stub()
          attachToCM: attachToCM = sinon.stub()
        })

        $compile('<div cm-editor sharejs-doc="sharejsDoc"></div>')($rootScope)
        $rootScope.$digest()

        expect(getSnapshot).to.have.been.called
        expect(openDoc).to.have.been.called
        expect(attachToCM).to.have.been.called
        expect(enableRichText).to.have.been.called
        expect(enableRichText.firstCall.args[0]).to.equal(cm)
        expect(enableRichText.firstCall.args[1]).to.be.an.instanceof(
          RichTextAdapter
        )

    it 'calls updateRichText when remoteop event is trigger', () ->
      @requirejs.callsArgWith(1, stubRichText({
        init: sinon.stub().returns({})
        updateRichText: updateRichText = sinon.stub()
      }))
      inject ($compile, $rootScope) ->
        $rootScope.sharejsDoc = stubSharejsDoc()
        $compile('<div cm-editor sharejs-doc="sharejsDoc"></div>')($rootScope)
        $rootScope.$digest()

        $rootScope.sharejsDoc.trigger('remoteop')
        expect(updateRichText).to.have.been.called


    it 'detaches from CM when destroyed', () ->
      @requirejs.callsArgWith(1, stubRichText({
        init: sinon.stub().returns({})
        disableRichText: disableRichText = sinon.stub()
      }))
      inject ($compile, $rootScope) ->
        $rootScope.sharejsDoc = stubSharejsDoc({
          detachFromCM: detachFromCM = sinon.stub()
        })

        $compile('<div cm-editor sharejs-doc="sharejsDoc"></div>')($rootScope)
        $rootScope.$digest()
        $rootScope.$broadcast('$destroy')

        expect(detachFromCM).to.have.been.called
        expect(disableRichText).to.have.been.called

  stubRichText = (overrides = {}) ->
    _.defaults(overrides, {
      init: sinon.stub()
      openDoc: sinon.stub()
      enableRichText: sinon.stub()
      disableRichText: sinon.stub()
      updateRichText: sinon.stub()
    })

  stubSharejsDoc = (overrides = {}) ->
    _.extend({
      attachToCM: sinon.stub()
      getSnapshot: sinon.stub()
      detachFromCM: sinon.stub()
    }, overrides, EventEmitter.prototype)
