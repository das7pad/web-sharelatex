define [
	"base"
], (App) ->
	
	POLLING_INTERVAL = 15
	ONE_MIN_MILI = 1000 * 60



	App.controller "EnagoController", ($scope, $modal, ide) ->
		$scope.openEnagoModal = () ->

			$modal.open {
				templateUrl: "enagoModalTemplate"
				controller: "EnagoModalController"
				scope:$scope
			}

	App.controller "EnagoModalController", ($scope, $modalInstance, ide, $timeout, $http) ->
		user_id = ide.$scope.user.id


		
		$scope.linkToEnago = ->
			window.open("/user/settings#enagoSettings")
			$scope.startedLinkProcess = true

		$scope.cancel = () ->
			$modalInstance.dismiss()
