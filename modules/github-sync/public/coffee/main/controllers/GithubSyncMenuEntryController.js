/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
	"base"
], App =>
	App.controller("GithubSyncMenuEntryController", ($scope, $modal) =>
		$scope.openImportModal = () =>
			$modal.open({
				templateUrl: "githubSyncImportModalTemplate",
				controller: "GithubSyncImportModalController",
				size: "lg"
			})
		
	)
);