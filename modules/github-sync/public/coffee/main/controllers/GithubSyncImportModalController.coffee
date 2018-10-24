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
		
		$http.get("/user/github-sync/status", { disableAutoLoginRedirect: true })
			.then (response) ->
				user = response.data
				$scope.status.user = user
				if !user.enabled
					$scope.status.loading = false
				else
					$http.get("/user/github-sync/repos", { disableAutoLoginRedirect: true })
						.then (response) ->
							{ data } = response
							$scope.status.loading = false
							$scope.status.repos = data.repos
						.catch (response) ->
							{ data, status } = response
							if status?
								$scope.status.error = { status }
							else
								$scope.status.error = true
			.catch () ->
				$scope.status.error = true
				
		$scope.importRepo = (repo) ->
			$scope.status.inflight = true
			$http
				.post("/project/new/github-sync", {
					_csrf: window.csrfToken
					projectName: repo.name
					repo: repo.full_name
					disableAutoLoginRedirect: true
				})
				.then (response) ->
					{ data } = response
					project_id = data.project_id
					window.location = "/project/#{project_id}"
				.catch (response) ->
					{ data, status } = response
					$scope.status.inflight = false
					if status?
						$scope.status.error = { status }
					else
						$scope.status.error = true
					

