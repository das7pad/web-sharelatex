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
			console.log('do we go here')
			modalInstance = $modal.open(
				templateUrl: "viewInV1ModalTemplate"
				controller: "viewInV1ModalController"
				scope: $scope
			)