define [
	"base"
], (App) ->
	App.controller "PublishController",
		($scope, $modal) ->
			$scope.openPublishProjectModal = () ->
				$modal.open(
					templateUrl: "publishProjectModalTemplate"
					scope: $scope
				)

				requirejs ['publish-modal'], (pm) ->
					modalBody = document.getElementsByClassName("modal-body-publish")[0]
					pm.init(modalBody)
