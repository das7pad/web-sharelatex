define [
	"base"
], (App) ->
	App.controller "MendeleyController", ($scope, $modal, ide) ->
		$scope.openMendeleyModal = () ->
			$modal.open {
				templateUrl: "mendeleyModalTemplate"
				controller: "MendeleyModalController"
				scope: $scope
			}
			
		ide.mendeleyManager = {
			openMendeleyModal: () -> $scope.openMendeleyModal()
		}