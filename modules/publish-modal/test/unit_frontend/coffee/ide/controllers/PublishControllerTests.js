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
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['ide/publish-modal/controllers/PublishController'], () =>
	describe('PublishController', function() {
		beforeEach(module('SharelatexApp'));

		let origRequireJsFn = null;

		beforeEach(function() {
			origRequireJsFn = window.requirejs;
			window.requirejs = (this.requirejs = sinon.stub());
			window._ide = sinon.stub();
			window._ide.fileTreeManager = sinon.stub();
			return window._ide.fileTreeManager.projectContainsFolder = sinon.stub();
		});

		afterEach(function() {
			window.Frontend = null;
			return window.requirejs = origRequireJsFn;
		});

		return it('inits Publish Modal', function() {
			let publishModalInit;
			this.requirejs.callsArgWith(1, {
				init: (publishModalInit = sinon.stub())
			});
			return inject(function($rootScope, $controller) {
				$rootScope.user = {first_name: 'first name', last_name: 'last name'};
				$rootScope.pdf = {logEntries: {}};
				$rootScope.project = {name: 'Test project name'};
				$controller('PublishController', {$scope: $rootScope});

				$rootScope.openPublishProjectModal();
				return expect(publishModalInit).to.have.been.called;
			});
		});
	})
);
