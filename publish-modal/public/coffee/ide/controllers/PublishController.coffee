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
					if ($scope.pdf.url)
						downloadLink = $scope.pdf.downloadUrl

					initParams = {
						projectId: $scope.project_id,
						pdfUrl: downloadLink,
						logs: $scope.pdf.logEntries,
						hasFolders: window._ide.fileTreeManager.projectContainsFolder(),
						firstName: $scope.user.first_name,
						lastName: $scope.user.last_name,
						title: $scope.project.name
					}
					modalBody = document.getElementsByClassName("modal-body-publish")[0]
					pm.init(modalBody, initParams)
