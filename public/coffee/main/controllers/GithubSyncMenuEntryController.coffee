define [
	"base"
], (App) ->
	App.controller "GithubSyncMenuEntryController", ($scope, $modal) ->
		$scope.openImportModal = () ->
			$modal.open({
				templateUrl: "githubSyncImportModalTemplate"
				controller: "GithubSyncImportModalController"
				size: "lg"
			})