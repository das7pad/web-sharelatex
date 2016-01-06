define [
	"base"
], (App) ->
	App.controller "ReferencesController", ($scope, $modal, ide) ->
		$scope.openReferencesModal = () ->
			$modal.open {
				templateUrl: "referencesModalTemplate"
				controller: "ReferencesModalController"
				scope: $scope
			}
			
		ide.referencesManager = {
			openReferencesModal: () -> $scope.openReferencesModal()
		}