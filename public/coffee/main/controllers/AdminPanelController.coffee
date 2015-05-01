define [
	"base"
], (App) ->

	App.controller "AdminPanelController", ($scope, $http, $timeout) ->
		$scope.users = window.data.users
		$scope.pages = window.data.pages
		$scope.allSelected = false
		$scope.selectedUsers = []
		$scope.predicate = "first_name"
		$scope.reverse = false
		$scope.timer
		$scope.pageSelected = 1

		sendSearch = ->
			data._csrf = window.csrfToken
			data.query = $scope.searchText
			data.page = $scope.pageSelected
			data.sort = $scope.predicate
			data.reverse = $scope.reverse
			request = $http.post "/admin/searchUsers", data
			request.success (data, status)->
				$scope.users = data.users
				$scope.pages = data.pages
				$scope.updateVisibleUsers()
			request.error (data, status)->
				console.log "the request failed"

		$scope.clearSearchText = () ->
			$scope.searchText = ""
			$scope.$emit "search:clear"
			sendSearch()

		$scope.searchUsers = ->
			$scope.pageSelected = 1;
			$timeout.cancel $scope.timer
			$scope.timer = $timeout (-> sendSearch()) , 700

		$scope.changePage = (page) ->
			$scope.pageSelected = page
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
			$scope.updatePages()

		$scope.updatePages = () ->
			$scope.pagesList = []
			if $scope.pages > 1
				$scope.pagesList.push i for i in [1..$scope.pages]

		$scope.changePredicate = (newPredicate)->
			if $scope.predicate == newPredicate
				$scope.reverse = !$scope.reverse
			$scope.predicate = newPredicate
			sendSearch()

		$scope.getSortIconClass = (column)->
			if column == $scope.predicate and $scope.reverse
				return "fa-caret-down"
			else if column == $scope.predicate and !$scope.reverse
				return "fa-caret-up"
			else
				return ""

		$scope.updateVisibleUsers()

	App.controller "UserListItemController", ($scope) ->
		$scope.$watch "user.selected", (value) ->
			if value?
				$scope.updateSelectedUsers()