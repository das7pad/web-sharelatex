define [
	"base"
], (App) ->
	App.controller "GitBridgeController", ($scope, $modal, ide) ->

		$scope.openGitBridgeModal = () ->
			$modal.open {
				templateUrl: "gitBridgeModalTemplate"
				controller: "GitBridgeModalController"
				scope: $scope
			}

		ide.gitBridgeManager = {
			openGitBridgeModal: () -> $scope.openGitBridgeModal()
		}
