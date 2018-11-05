define [
	"base"
], (App) ->

	App.controller "AdminUserListController", ($scope, $http, $timeout, $window, $modal, queuedHttp) ->
		$scope.users = window.data.users
		$scope.pages = window.data.pages
		$scope.allSelected = false
		$scope.selectedUsers = []
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
			$scope.isLoading = true
			data._csrf = window.csrfToken
			data.query = $scope.searchText
			data.regexp = $scope.searchRegExp
			data.secondaryEmailSearch = $scope.secondaryEmailSearch
			data.page = $scope.pageSelected
			request = $http.post "/admin/user/search", data
			request.then (response)->
				data = response.data
				$scope.users = data.users
				$scope.pages = data.pages
				$scope.updateVisibleUsers()
				$scope.isLoading = false
			request.catch ()->
				console.log "the request failed"
				$scope.isLoading = false

		$scope.clearSearchText = () ->
			$scope.searchText = ""
			$scope.$emit "search:clear"
			sendSearch()

		$scope.searchUsers = () ->
			$scope.pageSelected = 1
			sendSearch()

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

		$scope.getFirstSelectedUser = () ->
			$scope.selectedUsers[0]

		$scope.updatePages = () ->
			$scope.pagesList = []
			if $scope.pages > 1
				$scope.pagesList.push i for i in [1..Math.min(100, $scope.pages)]

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

		$scope.openSetPasswordModal = () ->
			modalInstance = $modal.open(
				templateUrl: "setPasswordModalTemplate"
				controller: "SetPasswordModalController"
				resolve:
					user: () -> $scope.getFirstSelectedUser()
			)
			modalInstance.result.then(
				(newPassword) ->
					$scope.SetUserPassword(newPassword)
			)

		$scope.SetUserPassword = (newPassword) ->
			selected_user = $scope.getFirstSelectedUser()

			queuedHttp.post "/admin/user/#{selected_user._id}/setPassword", {
				newPassword: newPassword
				_csrf: window.csrfToken
			}

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

	App.controller 'SetPasswordModalController', ($scope, $modalInstance, $timeout, user) ->
		$scope.user = user
		$scope.inputs = 
			newPassword: ""

		$scope.setPassword = () ->
			$modalInstance.close($scope.inputs.newPassword)

		$scope.cancel = () ->
			$modalInstance.dismiss('cancel')