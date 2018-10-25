define [
	"base"
], (App) ->
	App.controller "GitBridgeModalController", ($scope, $modalInstance, $window, ide) ->

		$scope.gitUrl = "#{$window.gitBridgeBaseUrl}/#{ide.$scope.project_id}"

		$scope.cancel = () ->
			$modalInstance.dismiss()
