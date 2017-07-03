define [
	"base",
	"libs/md5"
], (App) ->

	App.controller "AdminProjectController", ($scope, $timeout, $modal, queuedHttp) ->
		$scope.user = window.data.user
		$scope.projects = window.data.projects
		$scope.user.gravatar =  CryptoJS.MD5($scope.user.email).toString()
		$scope.selectedProjects = []
		$scope.predicate = "lastUpdated"
		$scope.reverse = true
		$scope.allSelected = false
		$scope.enableBetaError = false

		for project in $scope.projects
			project.accessLevel = "owner"

		$scope.enableBetaForUser = () ->
			$scope.enableBetaError = false
			queuedHttp({
				method: 'POST'
				url: "/admin/user/#{$scope.user._id}/setBetaStatus"
				headers:
					"X-CSRF-Token": window.csrfToken
					"Content-Type": "application/json"
				data:
					beta: true
			})
				.then(() -> $scope.user.betaProgram = true)
				.catch((response) -> console.error("Error", response.data); $scope.enableBetaError = true)

		$scope.disableBetaForUser = () ->
			$scope.enableBetaError = false
			queuedHttp({
				method: 'POST'
				url: "/admin/user/#{$scope.user._id}/setBetaStatus"
				headers:
					"X-CSRF-Token": window.csrfToken
					"Content-Type": "application/json"
				data:
					beta: false
			})
				.then(() -> $scope.user.betaProgram = false)
				.catch((response) -> console.error("Error", response.data); $scope.enableBetaError = true)

		$scope.clearSearchText = () ->
			$scope.searchText = ""
			$scope.updateVisibleProjects()

		$scope.searchProjects = () ->
			$scope.updateVisibleProjects()

		$scope.updateSelectedProjects = () ->
			$scope.selectedProjects = $scope.projects.filter (project) -> project.selected

		$scope.getSelectedProjects = () ->
			$scope.selectedProjects

		$scope.openArchiveProjectsModal = () ->
			modalInstance = $modal.open(
				templateUrl: "deleteProjectsModalTemplate"
				controller: "AdminDeleteProjectsModalController"
				resolve:
					projects: () -> $scope.getSelectedProjects()
			)
			modalInstance.result.then () ->
				$scope.archiveOrLeaveSelectedProjects()

		$scope.archiveOrLeaveSelectedProjects = () ->
			selected_projects = $scope.getSelectedProjects()

			for project in selected_projects
					project.archived = true;
					queuedHttp {
						method: "DELETE"
						url: "/admin/project/#{project._id}"
						headers:
							"X-CSRF-Token": window.csrfToken
					}

			$scope.updateVisibleProjects()

		$scope.changePredicate = (newPredicate)->
			if $scope.predicate == newPredicate
				$scope.reverse = !$scope.reverse
			$scope.predicate = newPredicate

		$scope.getSortIconClass = (column)->
			if column == $scope.predicate and $scope.reverse
				return "fa-caret-down"
			else if column == $scope.predicate and !$scope.reverse
				return "fa-caret-up"
			else
				return ""


		# delete user
		$scope.openDeleteUserModal = () ->
			modalInstance = $modal.open(
				templateUrl: "deleteUsersModalTemplate"
				controller: "DeleteUsersModalController"
				resolve:
					users: () -> [$scope.user]
			)
			modalInstance.result.then () ->
				$scope.DeleteUser()

		$scope.DeleteUser = () ->
			user = $scope.user
			queuedHttp({
				method: "DELETE"
				url: "/admin/user/#{user._id}"
				headers:
					"X-CSRF-Token": window.csrfToken
			}).then(() ->
				setTimeout(
					() ->
						window.location.href = '/admin/user'
					, 100
				)
			)


		# Set user password
		$scope.openSetPasswordModal = () ->
			modalInstance = $modal.open(
				templateUrl: "setPasswordModalTemplate"
				controller: "SetPasswordModalController"
				resolve:
					user: () -> $scope.user
			)
			modalInstance.result.then(
				(newPassword) ->
					$scope.SetUserPassword(newPassword)
			)
		$scope.SetUserPassword = (newPassword) ->
			queuedHttp.post "/admin/user/#{$scope.user._id}/setPassword", {
				newPassword: newPassword
				_csrf: window.csrfToken
			}

		$scope.updateVisibleProjects = () ->
			$scope.visibleProjects = []

			for project in $scope.projects
				visible = true
				# Only show if it matches any search text
				if $scope.searchText? and $scope.searchText != ""
					if !project.name.toLowerCase().match($scope.searchText.toLowerCase())
						visible = false

				if visible
					$scope.visibleProjects.push project
				else
					# We dont want hidden selections
					project.selected = false

		$scope.updateVisibleProjects()

	App.controller "AdminProjectListItemController", ($scope) ->
		$scope.$watch "project.selected", (value) ->
			if value?
				$scope.updateSelectedProjects()

	App.controller 'AdminDeleteProjectsModalController', ($scope, $modalInstance, $timeout, projects) ->
		$scope.projectsToDelete = projects

		$scope.action = "Delete"

		$scope.delete = () ->
			$modalInstance.close()

		$scope.cancel = () ->
			$modalInstance.dismiss('cancel')
