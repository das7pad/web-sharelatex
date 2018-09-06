define [
	"base"
], (App) ->
	App.controller "ViewSourceModalController", ($scope, $modalInstance) ->
		$scope.cancel = () ->
			$modalInstance.dismiss('cancel')