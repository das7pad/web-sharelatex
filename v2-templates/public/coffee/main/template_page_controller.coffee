define [
	"base"
], (App) ->
	App.controller "TemplatePageController", ($scope, $modal) ->
		$scope.openViewSourceModal = () ->
			modalInstance = $modal.open(
				templateUrl: "viewSourceModalTemplate"
				controller: "ViewSourceModalController"
				scope: $scope
			)

		$scope.openViewInV1Modal = () ->
			modalInstance = $modal.open(
				templateUrl: "viewInV1ModalTemplate"
				controller: "ViewInV1ModalController"
				scope: $scope
			)