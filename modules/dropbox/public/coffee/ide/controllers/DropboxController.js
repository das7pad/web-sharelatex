/* eslint-disable
    camelcase,
    max-len,
    no-return-assign,
    no-undef,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
	"base",
	"ide/permissions/PermissionsManager"
], function(App, PermissionsManager) {
	
	const POLLING_INTERVAL = 15;
	const ONE_MIN_MILI = 1000 * 60;

	let cachedState = {
		gotLinkStatus: false,
		startedLinkProcess: false,
		userIsLinkedToDropbox: false,
		hasDropboxFeature: false
	};


	App.controller("DropboxController", ($scope, $modal, ide) =>
		$scope.openDropboxModal = () =>

			$modal.open({
				templateUrl: "dropboxModalTemplate",
				controller: "DropboxModalController",
				scope:$scope
			})
		
);

	return App.controller("DropboxModalController", function($scope, $modalInstance, ide, $timeout, $http) {
		const user_id = ide.$scope.user.id;

		$scope.dbState = cachedState;
		$scope.dbState.hasDropboxFeature = $scope.project.features.dropbox;

		$http.get("/dropbox/status")
			.then(function(response) {
				const dropboxStatus = response.data;
				$scope.dbState.gotLinkStatus = true;
				if (dropboxStatus.registered) {
					$scope.dbState.userIsLinkedToDropbox = true;
					return cachedState = $scope.dbState;
				}
		});
		
		$scope.linkToDropbox = function() {
			window.open("/user/settings#dropboxSettings");
			return $scope.startedLinkProcess = true;
		};

		return $scope.cancel = () => $modalInstance.dismiss();
	});
});
