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
			owner: null
			name:  ide.$scope.project.name
			public: "true" # String to work with select box model
			description: ""
		}

		$http.get("/user/github-sync/orgs")
			.success (data) ->
				$scope.status.user = data.user
				$scope.status.orgs = data.orgs
				$scope.status.loading = false
				$scope.form.owner = $scope.status.user.login
				
			.error () ->
				$scope.status.error = true
				
		$scope.create = () ->
			$scope.status.inflight = true
			$http.post("/project/#{ide.project_id}/github-sync/export", {
					_csrf: window.csrfToken
					name: $scope.form.name
					owner: $scope.form.owner
					description: $scope.form.description
					public: $scope.form.public == "true"
				})
				.success () ->
					$scope.status.inflight = false
					$modalInstance.dismiss()
					ide.githubSyncManager.openGithubSyncModal()
					
				.error (data) ->
					$scope.form.error = data.error
					$scope.status.inflight = false
