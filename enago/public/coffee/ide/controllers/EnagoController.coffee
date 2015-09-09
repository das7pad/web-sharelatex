define [
	"base"
], (App) ->
	
	POLLING_INTERVAL = 15
	ONE_MIN_MILI = 1000 * 60

	App.controller "EnagoController", ($scope, $modal, ide, event_tracking) ->
		$scope.openEnagoModal = () ->
			event_tracking.send 'enago', 'open-modal'
			$modal.open {
				templateUrl: "enagoModalTemplate"
				controller: "EnagoModalController"
				scope:$scope
			}

	App.controller "EnagoModalController", ($scope, $modalInstance, ide, $timeout, $http, event_tracking) ->
		user_id = ide.$scope.user.id
		
		$scope.enagoLink = (page)->
			event_tracking.send 'enago', page

		$scope.cancel = () ->
			$modalInstance.dismiss()
