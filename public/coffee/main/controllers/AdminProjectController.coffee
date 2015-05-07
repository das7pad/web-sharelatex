temp = ""
define [
	"base",
	"libs/md5"
], (App) ->

	App.controller "AdminProjectController", ($scope, $timeout) ->
		$scope.user = window.data.user
		$scope.user.gravatar =  CryptoJS.MD5($scope.user.email)

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
		, 10

		$scope.updateVisibleProjects()

		$scope.clearSearchText = () ->
			$scope.$parent.searchText = $scope.searchText
			$scope.$parent.clearSearchText()

	App.controller "ProjectListItemController", ($scope) ->
		$scope.ownerName = () ->
			if $scope.project.owner?
				return "#{$scope.project.owner.first_name} #{$scope.project.owner.last_name}"
			else
				return "?"

		$scope.$watch "project.selected", (value) ->
			if value?
				$scope.updateSelectedProjects()