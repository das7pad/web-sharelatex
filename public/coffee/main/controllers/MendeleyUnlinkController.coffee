define [
	"base"
], (App) ->
	App.controller "MendeleyUnlinkController", ($scope, $modal) ->
		$scope.unlinkAccount = (providerStr) ->
			$modal.open({
				templateUrl: "mendeleyUnlinkModalTemplate"
				controller: "MendeleyUnlinkModalController"
				resolve:
					provider: () -> providerStr
			})

	App.controller 'MendeleyUnlinkModalController', ($scope, $modalInstance, provider) ->
		$scope.provider = provider
		$scope.providerUnlink = "/"+provider+"/unlink"