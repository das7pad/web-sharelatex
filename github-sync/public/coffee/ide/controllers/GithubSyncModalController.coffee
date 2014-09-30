define [
	"base"
], (App) ->
	App.controller "GithubSyncModalController", ($scope, $modalInstance, $http, ide) ->
		$scope.cancel = () ->
			$modalInstance.dismiss()
			
		$scope.status = {
			loading: true
			error: false
			user:
				enabled: null
			project:
				enabled: null
		}
		
		$http.get("/user/github-sync/status")
			.success (userStatus) ->
				$scope.status.user = userStatus
				if userStatus.enabled
					$http.get("/project/#{ide.project_id}/github-sync/status")
						.success (projectStatus) ->
							$scope.status.project = projectStatus
							$scope.status.loading = false
							
						.error () ->
							$scope.status.error = true
				else
					$scope.status.loading = false
				
			.error () ->
				$scope.status.error = true