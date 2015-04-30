define [
	"base"
], (App) ->

	App.controller "AdminPanelController", ($scope) ->
		$scope.users = window.data.users
		$scope.allSelected = false
		$scope.selectedUsers = []
		$scope.predicate = "lastLoggedIn"
		$scope.reverse = true

		$scope.clearSearchText = () ->
			$scope.searchText = ""
			$scope.$emit "search:clear"

		$scope.searchUsers = ->
			$scope.updateVisibleUsers()

		$scope.updateSelectedUsers = () ->
			$scope.selectedUsers = $scope.users.filter (user) -> user.selected

		$scope.updateVisibleUsers = () ->
			$scope.visibleUsers = []
			for user in $scope.users
				visible = true
				# Only show if it matches any search text
				if $scope.searchText? and $scope.searchText != ""
					if !user.first_name.toLowerCase().match($scope.searchText.toLowerCase())
						visible = false

				if visible
					$scope.visibleUsers.push user
				else
					# We don`t want hidden selections
					user.selected = false
					
		$scope.updateVisibleUsers()

	App.controller "UserListItemController", ($scope) ->
		$scope.$watch "user.selected", (value) ->
			if value?
				$scope.updateSelectedUsers()