define [
	"base"
], (App) ->
	App.controller "PublishController",
		($scope, $modal) ->
			publishModal = null

			$scope.openPublishProjectModal = () ->
				$modal.open(
					templateUrl: "publishProjectModalTemplate"
					scope: $scope
				)

				requirejs ['publish-modal'], (pm) ->
					publishModal = pm
					modalBody = document.getElementsByClassName("modal-body-publish")[0]
					pm.init(modalBody)
