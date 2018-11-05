/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
	"base"
], App =>

	App.controller("SharelatexAccountMergeCheckerController", function($scope, $http) {
		$scope.hasOlAccount = null;
		$scope.olEmail = "";
		$scope.errorCode = null;
		$scope.success = null;

		return $scope.submitEmail = function() {
			if (!$scope.olEmail) { return; }
			const data = {
				overleafEmail: $scope.olEmail,
				_csrf: window.csrfToken
			};
			$scope.errorCode = null;
			return $http.post("/account-merge/email/overleaf", data)
				.then(function(resp) {
					$scope.errorCode = null;
					return $scope.success = true;}).catch(function(resp) {
					$scope.errorCode = __guard__(resp != null ? resp.data : undefined, x => x.errorCode) || 'default_error';
					return $scope.success = false;
			});
		};
	})
);

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}