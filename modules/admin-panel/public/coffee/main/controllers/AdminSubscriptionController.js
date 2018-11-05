/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
	"base",
	"libs/md5"
], function(App) {
	App.controller("AdminSubscriptionController", function($scope, $http) {
		$scope.subscription = window.data.subscription;
		$scope.user_id = window.data.user_id;
		
		return $scope.deleteSubscription = function() {
			$scope.deleteError = false;
			return $http({
				url: `/admin/subscription/${$scope.subscription._id}`,
				method: "DELETE",
				headers: {
					"X-CSRF-Token": window.csrfToken
				}
			})
				.then(() => window.location = `/admin/user/${$scope.user_id}`).catch(() => $scope.deleteError = true);
		};
	});
		
	
	return App.controller("AdminCreateSubscriptionController", function($scope) {
		$scope.subscription = {
			customAccount: true,
			groupPlan: true,
			planCode: "professional",
			membersLimit: 10,
			admin_id: window.data.admin_id
		};

		return $scope.onSuccess = function(result) {
			const { subscription } = result.data;
			const location = `/admin/user/${subscription.admin_id}/subscription/${subscription._id}`;
			return window.location = location;
		};
	});
});
				

