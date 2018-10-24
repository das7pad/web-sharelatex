define [
	"base"
], (App) ->
	App.controller "GithubSyncModalController", ($scope, $modalInstance, $http, $modal, $window, $interval, ide) ->
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

		$scope.startFreeTrial = (source) ->
			ga?('send', 'event', 'subscription-funnel', 'upgraded-free-trial', source)
			window.open("/user/subscription/new?planCode=student_free_trial_7_days")
			$scope.startedFreeTrial = true
		
		$scope.linkAccount = () ->
			authWindow = $window.open("/github-sync/beginAuth", "github-sync-auth", "width=700,height=500")
			poller = $interval () ->
				# We can get errors when trying to access the URL before it returns 
				# to a ShareLaTeX URL (security exceptions)
				try
					pathname = authWindow?.location?.pathname
				catch e
					pathname = null
				if authWindow?.location?.pathname == "/github-sync/linked"
					authWindow.close()
					$scope.loadStatus()
					$interval.cancel(poller)
			, 1000
			return true # See https://github.com/angular/angular.js/issues/4853#issuecomment-28491586
			
		do $scope.loadStatus = () ->
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
			
			$http.get("/user/github-sync/status", { disableAutoLoginRedirect: true })
				.then (response) ->
					{ data } = response
					userStatus = data
					$scope.status.user = userStatus
					$http.get("/project/#{ide.project_id}/github-sync/status", { disableAutoLoginRedirect: true })
						.then (response) ->
							projectStatus = response.data
							$scope.status.project = projectStatus
							$scope.status.loading = false
							
							if $scope.status.project.enabled
								$http.get("/project/#{ide.project_id}/github-sync/commits/unmerged", { disableAutoLoginRedirect: true })
									.then (response) ->
										commits = response.data
										$scope.status.commits.commits = commits
										$scope.status.commits.loading = false
										
									.catch (response) ->
										{ data, status } = response
										if status?
											$scope.status.error = { status }
										else
											$scope.status.error = true
							
						.catch (response) ->
							{ data, status } = response
							if status?
								$scope.status.error = { status }
							else
								$scope.status.error = true
					
				.catch (response) ->
					{ data, status } = response
					if status?
						$scope.status.error = { status }
					else
						$scope.status.error = true