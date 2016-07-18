define [
	"base"
], (App) ->
	App.controller "ReferencesController", ($scope, $modal, ide, $http) ->
		user = ide.$scope.user
		$scope.thirdPartyReferencesEnabled = user?.features?.references
		$scope.openReferencesModal = (providerStr) ->
			$modal.open {
				templateUrl: "referencesModalTemplate"
				controller: "ReferencesModalController"
				scope: $scope
				resolve:
					provider: () -> providerStr
			}

		ide.referencesManager = {
			openReferencesModal: (providerStr) -> $scope.openReferencesModal(providerStr)
		}
