define [
	"base"
], (App) ->

	App.controller "AdminPanelController", ($scope, $http, $timeout, $window, $modal, queuedHttp) ->
		$scope.users = window.data.users
		$scope.pages = window.data.pages
		$scope.allSelected = false
		$scope.selectedUsers = []
		$scope.predicate = "first_name"
		$scope.reverse = false
		$scope.timer
		$scope.pageSelected = 1

		recalculateUserListHeight = () ->
			topOffset = $(".user-list-card").offset().top
			bottomOffset = $("footer").outerHeight() + 25
			sideBarHeight = $("aside").height() - 56
			# When footer is visible and page doesnt need to scroll we just make it
			# span between header and footer
			height = $window.innerHeight - topOffset - bottomOffset
			
			# When page is small enough that this pushes the project list smaller than
			# the side bar, then the window going to have to scroll to take into account the
			# footer. So we now start to track to the bottom of the window, with a 25px padding
			# since the footer is hidden below the fold. Dont ever get bigger than the sidebar
			# though since thats what triggered this happening in the first place.
			if height < sideBarHeight
				height = Math.min(sideBarHeight, $window.innerHeight - topOffset - 25)
			$scope.userListHeight = height
		
		$timeout () ->
			recalculateUserListHeight()
		, 0
		angular.element($window).bind "resize", () ->
			recalculateUserListHeight()
			$scope.$apply()

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

		$scope.searchUsers = () ->
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
					user.selected = false
			$scope.updatePages()

		$scope.getSelectedUsers = () ->
			$scope.selectedUsers

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

		$scope._removeUserFromList = (user) ->
			index = $scope.users.indexOf(user)
			if index > -1
				$scope.users.splice(index, 1)

		$scope.openDeleteUsersModal = () ->
			modalInstance = $modal.open(
				templateUrl: "deleteUsersModalTemplate"
				controller: "DeleteUsersModalController"
				resolve:
					users: () -> $scope.getSelectedUsers()
			)
			modalInstance.result.then () ->
				$scope.DeleteSelectedUsers()

		$scope.DeleteSelectedUsers = () ->
			selected_users = $scope.getSelectedUsers()

			for user in selected_users
				$scope._removeUserFromList user
				queuedHttp {
					method: "DELETE"
					url: "/admin/user/#{user._id}"
					headers:
						"X-CSRF-Token": window.csrfToken
				}

			$scope.searchUsers()

		$scope.updateVisibleUsers()

	App.controller "UserListItemController", ($scope) ->
		$scope.$watch "user.selected", (value) ->
			if value?
				$scope.updateSelectedUsers()

	App.controller 'DeleteUsersModalController', ($scope, $modalInstance, $timeout, users) ->
		$scope.users = users

		$scope.delete = () ->
			$modalInstance.close()

		$scope.cancel = () ->
			$modalInstance.dismiss('cancel')