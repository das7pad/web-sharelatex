define [
	"base"
], (App) ->
	App.controller "PublishController",
		($scope, $modal) ->
			$scope.openPublishProjectModal = () ->
				$modal.open(
					templateUrl: "publishProjectModalTemplate"
					scope: $scope
					size: "lg"
				)

				requirejs ['publish-modal'], (pm) ->
					modalBody = document.getElementsByClassName("modal-body-publish")[0]
					pm.init(modalBody, $scope.project_id, $scope.pdf.downloadUrl)
