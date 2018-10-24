define [
	"base"
], (App) ->
	App.controller "ReferenceUnlinkController", ($scope, $modal) ->
		$scope.unlinkAccount = (providerStr) ->
			$modal.open({
				templateUrl: "referenceUnlinkModalTemplate"
				controller: "ReferenceUnlinkModalController"
				resolve:
					provider: () -> providerStr
			})

	App.controller 'ReferenceUnlinkModalController', ($scope, $modalInstance, provider) ->
		$scope.provider = provider
		$scope.providerUnlink = "/"+provider+"/unlink"