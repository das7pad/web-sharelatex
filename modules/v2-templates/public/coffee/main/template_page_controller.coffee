define [
	"base"
], (App) ->
	App.controller "TemplatePageController", ($scope, $modal) ->
		$scope.openViewSourceModal = () ->
			modalInstance = $modal.open(
				templateUrl: "viewSourceModalTemplate"
			)

		$scope.openViewInV1Modal = () ->
			modalInstance = $modal.open(
				templateUrl: "viewInV1ModalTemplate"
			)