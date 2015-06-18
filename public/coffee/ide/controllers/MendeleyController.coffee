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
			
		ide.githubSyncManager = {
			openMendeleyModal: () -> $scope.openMendeleyModal()
		}