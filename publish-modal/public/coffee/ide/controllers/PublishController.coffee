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
					if ($scope.pdf)
						downloadLink = $scope.pdf.downloadUrl

					modalBody = document.getElementsByClassName("modal-body-publish")[0]
					pm.init(modalBody, $scope.project_id, downloadLink)
