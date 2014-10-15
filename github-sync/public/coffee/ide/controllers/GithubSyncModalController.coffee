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
			
		$scope.openMergeModal = (mergeImmediately = false) ->
			$modalInstance.dismiss()
			# There is no difference in the ShareLaTeX system between
			# pushing and pulling to Github. The merge request will do both:
			# push any changes in ShareLaTeX to GitHub, and import any changes
			# in GitHub back to ShareLaTeX after merging. However, from a UI
			# point of view, it's much clearer to show two options:
			# 'push to github', and 'pull from github' depending on the state of
			# the project and the commits in git. Hence the two different
			# modals for acheiving the same thing.
			if mergeImmediately
				template = "githubSyncPullFromGithubModalTemplate"
			else
				template = "githubSyncPushToGithubModalTemplate"
			$modal.open {
				templateUrl: template
				controller: "GithubSyncMergeModalController"
				resolve:
					mergeImmediately: () -> mergeImmediately
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