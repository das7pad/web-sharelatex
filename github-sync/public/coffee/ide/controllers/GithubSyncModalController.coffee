define [
	"base"
], (App) ->
	App.controller "GithubSyncModalController", ($scope, $modalInstance, $http, $modal, ide) ->
		$scope.cancel = () ->
			$modalInstance.dismiss()
			
		$scope.openExportToGithubModal = () ->
			$modalInstance.dismiss()
			$modal.open {
				templateUrl: "githubSyncExportModalTemplate"
				controller: "GithubSyncExportModalController"
			}
			
		$scope.openMergeModal = () ->
			$modalInstance.dismiss()
			$modal.open {
				templateUrl: "githubSyncMergeModalTemplate"
				controller: "GithubSyncMergeModalController"
			}
			
			
		$scope.status = {
			loading: true
			error: false
			user:
				enabled: null
			project:
				enabled: null
			commits: {
				loading: true
				commits: []
			}
		}
		
		$http.get("/user/github-sync/status")
			.success (userStatus) ->
				$scope.status.user = userStatus
				if userStatus.enabled
					$http.get("/project/#{ide.project_id}/github-sync/status")
						.success (projectStatus) ->
							$scope.status.project = projectStatus
							$scope.status.loading = false
							
							if $scope.status.project.enabled
								$http.get("/project/#{ide.project_id}/github-sync/commits/unmerged")
									.success (commits) ->
										$scope.status.commits.commits = commits
										$scope.status.commits.loading = false
										
									.error () ->
										$http.status.error = true
							
						.error () ->
							$scope.status.error = true
				else
					$scope.status.loading = false
				
			.error () ->
				$scope.status.error = true