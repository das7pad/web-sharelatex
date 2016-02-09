define [
	"base"
], (App) ->

	App.controller "ReferencesSearchController", ($scope, $modal, ide) ->
		console.log ">> init ReferencesSearchController"
		$scope.openReferencesSearchModal = (providerStr) ->
			$modal.open {
				templateUrl: "referencesSearchModalTemplate"
				controller: "ReferencesSearchModalController"
				scope: $scope
				resolve:
					provider: () -> providerStr
			}

		ide.referencesSearchManager = {
			openReferencesModal: (providerStr) -> $scope.openReferencesModal(providerStr)
		}
