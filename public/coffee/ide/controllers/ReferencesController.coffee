define [
	"base"
], (App) ->
	App.controller "ReferencesController", ($scope, $modal, ide, $http) ->
		$scope.thirdPartyReferencesEnabled = ide.featureToggle == 'tpr'
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
