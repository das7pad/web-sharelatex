define ['ide/rich-text/directives/cmEditor'], () ->
  describe 'cmEditor', () ->
    beforeEach(module('SharelatexApp'))

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

    it 'attaches to CM', () ->
      init = sinon.stub().returns({}) # Stub initing CM and returning instance
      openDoc = sinon.stub()
      @requirejs.callsArgWith(1, {
        init: init
        openDoc: openDoc
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

    it 'detaches from CM when destroyed', () ->
      @requirejs.callsArgWith(1, {
        init: sinon.stub().returns({})
        openDoc: sinon.stub()
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
