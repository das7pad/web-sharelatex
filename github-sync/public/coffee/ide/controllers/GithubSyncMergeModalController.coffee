define [
	"base"
], (App) ->
	App.controller "GithubSyncMergeModalController", ($scope, $modalInstance, $http, ide) ->
		$scope.cancel = () ->
			$modalInstance.dismiss()
		
		$scope.status = {}
		$scope.form =
			message: ""
		
		$scope.merge = () ->
			$scope.status.inflight = true
			data = {
				_csrf: window.csrfToken
				message: $scope.form.message
			}
			$http.post("/project/#{ide.project_id}/github-sync/merge", data)
				.success () ->
					$scope.status.inflight = false
					$modalInstance.dismiss()
					ide.githubSyncManager.openGithubSyncModal()
					
				.error (data) ->
					$scope.form.error = data.error
					$scope.status.inflight = false
