define [
  "ide/rich-text/controllers/editor_loader_controller"
  "utils/EventEmitter"
], (EditorLoaderController, EventEmitter) ->
  describe 'EditorLoaderController', () ->
    beforeEach module 'SharelatexApp'

    origRequireJsFn = null
    beforeEach () ->
      origRequireJsFn = window.requirejs
      window.requirejs = @requirejs = sinon.stub()

    afterEach () ->
      window.requirejs = origRequireJsFn

    it 'inits richText scope', () ->
      inject ($rootScope, $controller) =>
        $scope = $rootScope.$new()
        $controller('EditorLoaderController', { $scope: $scope })

        expect($scope.richText.bundle).to.equal(null)
        expect($scope.richText.formattingEvents).to.be.an.instanceof(EventEmitter)

    it 'watches showRichText and loads bundle if true', () ->
      inject ($rootScope, $controller) =>
        $scope = $rootScope.$new()
        $scope.editor = { showRichText: false }

        expect(@requirejs).to.not.have.been.called

        $controller('EditorLoaderController', { $scope: $scope })

        $scope.editor.showRichText = true
        $rootScope.$digest()

        expect(@requirejs).to.have.been.called

    it 'watches showRichText and does nothing if false', () ->
      inject ($rootScope, $controller) =>
        $scope = $rootScope.$new()
        $scope.editor = { showRichText: true }

        $controller('EditorLoaderController', { $scope: $scope })

        $scope.editor.showRichText = false
        $rootScope.$digest()

        expect(@requirejs).to.not.have.been.called
