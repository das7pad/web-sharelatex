define [
	"base"
], (App) ->
	App.controller "ReferencesSearchModalController", ($scope, $modalInstance, $http, $window, $interval, ide) ->

		$scope.cancel = () ->
			$modalInstance.dismiss('cancel')
