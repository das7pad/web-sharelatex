define ['ide/publish-modal/controllers/PublishController'], () ->
	describe 'PublishController', () ->
		beforeEach(module('SharelatexApp'))

		origRequireJsFn = null

		beforeEach () ->
			origRequireJsFn = window.requirejs
			window.requirejs = @requirejs = sinon.stub()
			window._ide = sinon.stub()
			window._ide.fileTreeManager = sinon.stub()
			window._ide.fileTreeManager.projectContainsFolder = sinon.stub()

		afterEach () ->
			window.Frontend = null
			window.requirejs = origRequireJsFn

		it 'inits Publish Modal', () ->
			@requirejs.callsArgWith(1, {
				init: publishModalInit = sinon.stub()
			})
			inject ($rootScope, $controller) ->
				$rootScope.user = {first_name: 'first name', last_name: 'last name'}
				$rootScope.pdf = {logEntries: {}}
				$rootScope.project = {name: 'Test project name'}
				$controller('PublishController', {$scope: $rootScope})

				$rootScope.openPublishProjectModal()
				expect(publishModalInit).to.have.been.called
