define [
	"base"
], (App) ->
	App.controller "GithubSyncImportModalController", ($scope, $modalInstance, $http) ->
		$scope.cancel = () ->
			$modalInstance.dismiss()
			
		$scope.status = {
			loading: true
			error: false
		}
		
		$http.get("/user/github-sync/repos")
			.success (data) ->
				$scope.status.loading = false
				$scope.status.repos = data.repos
				console.log data
				
			.error () ->
				$scope.status.error = true

