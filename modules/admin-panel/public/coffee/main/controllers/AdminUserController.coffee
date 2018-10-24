define [
	"base",
	"libs/md5"
], (App) ->

	App.controller "AdminUserController", ($scope, $timeout, $modal, queuedHttp) ->
		$scope.user = window.data.user
		$scope.projects = window.data.projects
		$scope.searchText =
			value: ""
		$scope.searchRegExp =
			value: false
		$scope.selectedProjects = []
		$scope.predicate = "lastUpdated"
		$scope.reverse = true
		$scope.allSelected = false
		$scope.enableBetaError = false

		for project in $scope.projects
			project.accessLevel = "owner"

		$scope.clearSearchText = () ->
			$scope.searchText.value = ""
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


		$scope.openDeleteSecondaryEmailModal = (emailToRemove) ->
			modalInstance = $modal.open(
				templateUrl: "deleteSecondaryEmailModalTemplate"
				controller: "DeleteSecondaryEmailModalController"
				resolve:
					users: () -> [{email:emailToRemove}]
			)
			modalInstance.result.then () ->
				console.log 
				queuedHttp({
					method: "DELETE"
					url: "/admin/user/#{$scope.user._id}/secondaryemail"
					data:
						emailToRemove:emailToRemove
					headers:
						 #required for angular 1 to send data on delete which is valid
						'Content-type': 'application/json;charset=utf-8'
						"X-CSRF-Token": window.csrfToken
				}).then(() ->
					setTimeout(
						() ->
							window.location.href = "/admin/user/#{$scope.user._id}"
						, 100
					)
				)


		$scope.openUnlinkOlModal = () ->
			modalInstance = $modal.open(
				templateUrl: "unlinkOlModalTemplate"
				controller: "UnlinkOlModalController"
				resolve:
					users: () -> [$scope.user]
			)
			modalInstance.result.then () ->
				queuedHttp({
					method: "DELETE"
					url: "/admin/user/#{$scope.user._id}/overleaf"
					headers:
						"X-CSRF-Token": window.csrfToken
				}).then(() ->
					setTimeout(
						() ->
							window.location.href = "/admin/user/#{$scope.user._id}"
						, 100
					)
				)


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

		$scope.updateVisibleProjects = () ->
			$scope.visibleProjects = []

			for project in $scope.projects
				visible = true
				# Only show if it matches any search text
				if $scope.searchText.value? and $scope.searchText.value != ""
					if !project.name.toLowerCase().match($scope.searchText.value.toLowerCase())
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

	App.controller 'UnlinkOlModalController', ($scope, $modalInstance, $timeout, users) ->
		$scope.users = users

		$scope.unlink = () ->
			$modalInstance.close()

		$scope.cancel = () ->
			$modalInstance.dismiss('cancel')

	App.controller 'DeleteSecondaryEmailModalController', ($scope, $modalInstance, $timeout, users) ->
		$scope.users = users

		$scope.delete = () ->
			$modalInstance.close()

		$scope.cancel = () ->
			$modalInstance.dismiss('cancel')
