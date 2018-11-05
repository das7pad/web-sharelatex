/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
	"base",
	"ide/directives/SafePath"
], (App, SafePath) =>

	App.directive("validFile", () =>
		({
			require: 'ngModel',
			link(scope, element, attrs, ngModelCtrl) {
				return ngModelCtrl.$validators.validFile = filename => SafePath.isCleanFilename(filename);
			}
		})
)
);
