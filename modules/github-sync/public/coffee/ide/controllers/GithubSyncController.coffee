define [
	"base"
], (App) ->
	App.controller "GithubSyncController", ($scope, $modal, ide) ->
		$scope.openGithubSyncModal = () ->
			$modal.open {
				templateUrl: "githubSyncModalTemplate"
				controller: "GithubSyncModalController"
				scope: $scope
			}
			
		ide.githubSyncManager = {
			openGithubSyncModal: () -> $scope.openGithubSyncModal()
		}