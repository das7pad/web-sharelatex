define [
	"base"
], (App) ->
	App.controller "ViewInV1ModalController", ($scope, $modalInstance) ->
		$scope.cancel = () ->
			$modalInstance.dismiss('cancel')