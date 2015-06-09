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
		
		$http.get("/user/github-sync/status")
			.success (user) ->
				$scope.status.user = user
				if !user.enabled
					$scope.status.loading = false
				else
					$http.get("/user/github-sync/repos")
						.success (data) ->
							$scope.status.loading = false
							$scope.status.repos = data.repos
						.error () ->
							$scope.status.error = true
			.error () ->
				$scope.status.error = true
				
		$scope.importRepo = (repo) ->
			$scope.status.inflight = true
			$http
				.post("/project/new/github-sync", {
					_csrf: window.csrfToken
					projectName: repo.name
					repo: repo.full_name
				})
				.success (data) ->
					project_id = data.project_id
					window.location = "/project/#{project_id}"
				.error (data) ->
					$scope.status.inflight = false
					$scope.status.error = true
					

