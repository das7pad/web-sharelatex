define [
	"base"
], (App) ->
	App.controller "PublishController",
		($scope, $modal) ->
			firstOpen = false
			publishModal = null

			$scope.openPublishProjectModal = () ->
				$modal.open(
					templateUrl: "publishProjectModalTemplate"
					scope: $scope
				)

				if !firstOpen
					firstOpen = true
					requirejs ['publish-modal'], (pm) ->
						publishModal = pm
						modalBody = document.getElementsByClassName("modal-body-publish")[0]
						pm.init(modalBody)
