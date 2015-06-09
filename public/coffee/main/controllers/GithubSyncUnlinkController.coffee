define [
	"base"
], (App) ->
	App.controller "GithubSyncUnlinkController", ($scope, $modal) ->
		$scope.unlinkAccount = () ->
			$modal.open({
				templateUrl: "githubSyncUnlinkModalTemplate"
			})