define [
	"base",
	"libs/md5"
], (App) ->

	App.controller "AdminProjectController", ($scope, $timeout, $modal, queuedHttp) ->
		$scope.user = window.data.user
		$scope.user.gravatar =  CryptoJS.MD5($scope.user.email).toString()

		for project in $scope.projects
			project.id = project._id
			project.archived = false
			project.accessLevel = "owner"
			if project.owner_ref == $scope.user._id
				project.owner = $scope.user

		if $scope.projects.length == 0
			$scope.projects = [{}]

		$timeout () ->
			$(".projectName").attr 'href', "/admin" + $(".projectName").attr 'href'
			$(".projectName").attr 'target', "_blank"
			$(".dropdown.btn-group").hide()
			$("[tooltip=Download]").hide()
		, 10

		$scope.updateVisibleProjects()

		$scope.clearSearchText = () ->
			$scope.searchText = ""
			$scope.$parent.clearSearchText()

		$scope.searchProjects = () ->
			$scope.$parent.searchText = $scope.searchText
			$scope.$parent.updateVisibleProjects()

		$scope.openArchiveProjectsModal = () ->
			modalInstance = $modal.open(
				templateUrl: "deleteProjectsModalTemplate"
				controller: "DeleteProjectsModalController"
				resolve:
					projects: () -> $scope.getSelectedProjects()
			)
			modalInstance.result.then () ->
				$scope.archiveOrLeaveSelectedProjects()

		$scope.archiveOrLeaveSelectedProjects = () ->
			selected_projects = $scope.getSelectedProjects()
			selected_project_ids = $scope.getSelectedProjectIds()
			
			for project in selected_projects
					queuedHttp {
						method: "DELETE"
						url: "/admin/project/#{project.id}"
						headers:
							"X-CSRF-Token": window.csrfToken
					}

			$scope.updateVisibleProjects()

	App.controller "ProjectListItemController", ($scope) ->
		$scope.ownerName = () ->
			if $scope.project.owner?
				return "#{$scope.project.owner.first_name} #{$scope.project.owner.last_name}"
			else
				return "?"

		$scope.$watch "project.selected", (value) ->
			if value?
				$scope.updateSelectedProjects()