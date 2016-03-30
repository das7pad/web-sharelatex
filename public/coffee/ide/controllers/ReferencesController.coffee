define [
	"base"
], (App) ->
	App.controller "ReferencesController", ($scope, $modal, ide, $http) ->
		$scope.openReferencesModal = (providerStr) ->
			$modal.open {
				templateUrl: "referencesModalTemplate"
				controller: "ReferencesModalController"
				scope: $scope
				resolve:
					provider: () -> providerStr
			}

		$scope.loadBibtex = (provider) ->
			$scope.status = {
				loading: true
				error: false
				reindex: false
				user: false
			}

			$http.get("/#{provider}/bibtex")
				.success (data) ->
					# $scope.status.reindex = data.reindex
					# $scope.status.user = data.user
					console.log ">> yay"
					console.log data
					$scope.status.loading = false

				.error () ->
					$scope.status.error = true
					$scope.status.loading = false

		ide.referencesManager = {
			openReferencesModal: (providerStr) -> $scope.openReferencesModal(providerStr)
		}

		window._loadMendeleyBibtex = () ->
			$scope.loadBibtex('mendeley')
