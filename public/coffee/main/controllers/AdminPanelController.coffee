define [
	"base"
], (App) ->

	App.controller "AdminPanelController", ($scope, $http) ->
		$scope.users = window.data.users
		$scope.allSelected = false
		$scope.selectedUsers = []
		$scope.predicate = "lastLoggedIn"
		$scope.reverse = true

		sendSearch = ->
			request = $http.get "/admin/searchUsers?q=" + $scope.searchText
			request.success (data, status)->
				$scope.users = data.users
				$scope.updateVisibleUsers()
			request.error (data, status)->
				console.log "the request failed"

		$scope.clearSearchText = () ->
			$scope.searchText = ""
			$scope.$emit "search:clear"

		$scope.searchUsers = ->
			sendSearch()

		$scope.updateSelectedUsers = () ->
			$scope.selectedUsers = $scope.users.filter (user) -> user.selected

		$scope.updateVisibleUsers = () ->
			$scope.visibleUsers = []
			for user in $scope.users
				visible = true

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