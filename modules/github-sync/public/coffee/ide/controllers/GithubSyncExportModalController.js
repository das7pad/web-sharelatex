define [
	"base"
], (App) ->
	App.controller "GithubSyncExportModalController", ($scope, $modalInstance, $http, ide) ->
		$scope.cancel = () ->
			$modalInstance.dismiss()
			
		$scope.status = {
			loading: true
			error: false
		}
		
		$scope.form = {
			org: null
			name:  ide.$scope.project.name
			private: "false" # String to work with select box model
			description: ""
		}

		$http.get("/user/github-sync/orgs", { disableAutoLoginRedirect: true })
			.then (response) ->
				{ data } = response
				$scope.status.user = data.user
				$scope.status.orgs = data.orgs
				$scope.status.loading = false
				$scope.form.org = $scope.status.user.login
				
			.catch (response) ->
				{ data, status } = response
				$scope.status.error = {
					message: data?.error,
					statusCode: status
				}
				
		$scope.create = () ->
			$scope.status.inflight = true
			data = {
				_csrf: window.csrfToken
				name: $scope.form.name
				description: $scope.form.description
				private: $scope.form.private == "true"
			}
			# If the user selected themselves as the owner, we
			# don't need to send an org
			if $scope.form.org? and $scope.form.org != $scope.status.user.login
				data.org = $scope.form.org
			$http.post("/project/#{ide.project_id}/github-sync/export", data)
				.then () ->
					$scope.status.inflight = false
					$modalInstance.dismiss()
					ide.githubSyncManager.openGithubSyncModal()
					
				.catch (response) ->
					{ data } = response
					$scope.form.error = data.error
					$scope.status.inflight = false
