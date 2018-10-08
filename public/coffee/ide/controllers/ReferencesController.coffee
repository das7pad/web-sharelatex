define [
	"base"
], (App) ->
	App.controller "ReferencesController", ($scope, $modal, ide, $http) ->
		user = ide.$scope.user
		features = user?.features
		$scope.thirdPartyReferencesEnabled = features?.mendeley or features?.references

		$scope.openNewDocModal = () ->
			$modal.open(
				templateUrl: "newFileModalTemplate"
				controller:  "NewFileModalController"
				size: 'lg'
				resolve: {
					parent_folder: () -> $scope.entity
					type: () -> 'mendeley'
				}
			)
