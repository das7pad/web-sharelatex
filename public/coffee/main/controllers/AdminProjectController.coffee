define [
	"base"
], (App) ->

	App.controller "AdminProjectController", ($scope) ->
		$scope.user = window.data.user

		for project in $scope.projects
			project.id = ""
			if project.owner_ref == $scope.user._id
				project.owner = $scope.user

		if $scope.projects.length == 0
			$scope.projects = [{}]