define ['ide/publish-modal/controllers/PublishController'], () ->
	describe 'PublishController', () ->
		beforeEach(module('SharelatexApp'))

		origRequireJsFn = null

		beforeEach () ->
			origRequireJsFn = window.requirejs
			window.requirejs = @requirejs = sinon.stub()

		afterEach () ->
			window.Frontend = null
			window.requirejs = origRequireJsFn

		it 'inits Publish Modal', () ->
			@requirejs.callsArgWith(1, {
				init: publishModalInit = sinon.stub()
			})
			inject ($rootScope, $controller) ->
				$controller('PublishController', {$scope: $rootScope})

				$rootScope.openPublishProjectModal()
				expect(publishModalInit).to.have.been.called
