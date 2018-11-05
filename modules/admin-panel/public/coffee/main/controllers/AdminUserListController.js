/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
	"base"
], function(App) {

	App.controller("AdminUserListController", function($scope, $http, $timeout, $window, $modal, queuedHttp) {
		$scope.users = window.data.users;
		$scope.pages = window.data.pages;
		$scope.allSelected = false;
		$scope.selectedUsers = [];
		$scope.timer;
		$scope.pageSelected = 1;

		const recalculateUserListHeight = function() {
			const topOffset = $(".user-list-card").offset().top;
			const bottomOffset = $("footer").outerHeight() + 25;
			const sideBarHeight = $("aside").height() - 56;
			// When footer is visible and page doesnt need to scroll we just make it
			// span between header and footer
			let height = $window.innerHeight - topOffset - bottomOffset;
			
			// When page is small enough that this pushes the project list smaller than
			// the side bar, then the window going to have to scroll to take into account the
			// footer. So we now start to track to the bottom of the window, with a 25px padding
			// since the footer is hidden below the fold. Dont ever get bigger than the sidebar
			// though since thats what triggered this happening in the first place.
			if (height < sideBarHeight) {
				height = Math.min(sideBarHeight, $window.innerHeight - topOffset - 25);
			}
			return $scope.userListHeight = height;
		};
		
		$timeout(() => recalculateUserListHeight()
		, 0);
		angular.element($window).bind("resize", function() {
			recalculateUserListHeight();
			return $scope.$apply();
		});

		const sendSearch = function() {
			$scope.isLoading = true;
			data._csrf = window.csrfToken;
			data.query = $scope.searchText;
			data.regexp = $scope.searchRegExp;
			data.secondaryEmailSearch = $scope.secondaryEmailSearch;
			data.page = $scope.pageSelected;
			const request = $http.post("/admin/user/search", data);
			request.then(function(response){
				const { data } = response;
				$scope.users = data.users;
				$scope.pages = data.pages;
				$scope.updateVisibleUsers();
				return $scope.isLoading = false;
			});
			return request.catch(function(){
				console.log("the request failed");
				return $scope.isLoading = false;
			});
		};

		$scope.clearSearchText = function() {
			$scope.searchText = "";
			$scope.$emit("search:clear");
			return sendSearch();
		};

		$scope.searchUsers = function() {
			$scope.pageSelected = 1;
			return sendSearch();
		};

		$scope.changePage = function(page) {
			$scope.pageSelected = page;
			return sendSearch();
		};

		$scope.updateSelectedUsers = () => $scope.selectedUsers = $scope.users.filter(user => user.selected);

		$scope.updateVisibleUsers = function() {
			$scope.visibleUsers = [];
			for (let user of Array.from($scope.users)) {
				const visible = true;

				if (visible) {
					$scope.visibleUsers.push(user);
				} else {
					user.selected = false;
				}
			}
			return $scope.updatePages();
		};

		$scope.getSelectedUsers = () => $scope.selectedUsers;

		$scope.getFirstSelectedUser = () => $scope.selectedUsers[0];

		$scope.updatePages = function() {
			$scope.pagesList = [];
			if ($scope.pages > 1) {
				return __range__(1, Math.min(100, $scope.pages), true).map((i) => $scope.pagesList.push(i));
			}
		};

		$scope._removeUserFromList = function(user) {
			const index = $scope.users.indexOf(user);
			if (index > -1) {
				return $scope.users.splice(index, 1);
			}
		};

		$scope.openDeleteUsersModal = function() {
			const modalInstance = $modal.open({
				templateUrl: "deleteUsersModalTemplate",
				controller: "DeleteUsersModalController",
				resolve: {
					users() { return $scope.getSelectedUsers(); }
				}
			});
			return modalInstance.result.then(() => $scope.DeleteSelectedUsers());
		};

		$scope.DeleteSelectedUsers = function() {
			const selected_users = $scope.getSelectedUsers();

			for (let user of Array.from(selected_users)) {
				$scope._removeUserFromList(user);
				queuedHttp({
					method: "DELETE",
					url: `/admin/user/${user._id}`,
					headers: {
						"X-CSRF-Token": window.csrfToken
					}
				});
			}

			return $scope.searchUsers();
		};

		$scope.openSetPasswordModal = function() {
			const modalInstance = $modal.open({
				templateUrl: "setPasswordModalTemplate",
				controller: "SetPasswordModalController",
				resolve: {
					user() { return $scope.getFirstSelectedUser(); }
				}
			});
			return modalInstance.result.then(
				newPassword => $scope.SetUserPassword(newPassword));
		};

		$scope.SetUserPassword = function(newPassword) {
			const selected_user = $scope.getFirstSelectedUser();

			return queuedHttp.post(`/admin/user/${selected_user._id}/setPassword`, {
				newPassword,
				_csrf: window.csrfToken
			});
		};

		return $scope.updateVisibleUsers();
	});

	App.controller("UserListItemController", $scope =>
		$scope.$watch("user.selected", function(value) {
			if (value != null) {
				return $scope.updateSelectedUsers();
			}
		})
	);

	App.controller('DeleteUsersModalController', function($scope, $modalInstance, $timeout, users) {
		$scope.users = users;

		$scope.delete = () => $modalInstance.close();

		return $scope.cancel = () => $modalInstance.dismiss('cancel');
	});

	return App.controller('SetPasswordModalController', function($scope, $modalInstance, $timeout, user) {
		$scope.user = user;
		$scope.inputs = 
			{newPassword: ""};

		$scope.setPassword = () => $modalInstance.close($scope.inputs.newPassword);

		return $scope.cancel = () => $modalInstance.dismiss('cancel');
	});
});
function __range__(left, right, inclusive) {
  let range = [];
  let ascending = left < right;
  let end = !inclusive ? right : ascending ? right + 1 : right - 1;
  for (let i = left; ascending ? i < end : i > end; ascending ? i++ : i--) {
    range.push(i);
  }
  return range;
}