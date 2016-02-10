define [
	"base"
], (App) ->

	App.controller "ReferencesSearchController", ($scope, $modal, ide) ->

		$scope.searchEnabled = () ->
			ide?.$scope?.project?.features?.references == true

		console.log ">> init ReferencesSearchController"

		window._xx = () ->
			$scope.openReferencesSearchModal()

		$scope.openReferencesSearchModal = () ->
			if $scope.searchEnabled()
				console.log ">> opening modal"
				$modal.open {
					templateUrl: "referencesSearchModalTemplate"
					controller: "ReferencesSearchModalController"
					scope: $scope
					size: 'lg'
				}
			else
				console.log ">> nope"

		ide.referencesSearchManager = {
			openReferencesModal: (providerStr) -> $scope.openReferencesSearchModal(providerStr)
		}
