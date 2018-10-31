define [
	"base"
], (App) ->
	App.controller "GitBridgeModalController", ($scope, $modalInstance, $window, ide) ->

		$scope.gitUrl = "#{$window.gitBridgePublicBaseUrl}/#{ide.$scope.project_id}"
		$scope.hasGitBridgeFeature = $scope.project.features.gitBridge
		$scope.userIsProjectOwner = $scope.user.id == $scope.project.owner._id

		$scope.cancel = () ->
			$modalInstance.dismiss()
