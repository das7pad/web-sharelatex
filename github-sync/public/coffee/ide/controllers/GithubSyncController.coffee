define [
	"base"
], (App) ->
	App.controller "GithubSyncController", ($scope, $modal) ->
		$scope.openGithubSyncModal = () ->
			$modal.open {
				templateUrl: "githubSyncModalTemplate"
				controller: "GithubSyncModalController"
				scope:$scope
			}