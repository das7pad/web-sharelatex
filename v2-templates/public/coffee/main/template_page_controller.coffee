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