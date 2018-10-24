define [
	"base",
	"libs/md5"
], (App) ->
	App.controller "AdminSubscriptionController", ($scope, $http) ->
		$scope.subscription = window.data.subscription
		$scope.user_id = window.data.user_id
		
		$scope.deleteSubscription = () ->
			$scope.deleteError = false
			$http({
				url: "/admin/subscription/#{$scope.subscription._id}"
				method: "DELETE"
				headers:
					"X-CSRF-Token": window.csrfToken
			})
				.then () ->
					window.location = "/admin/user/#{$scope.user_id}"
				.catch () ->
					$scope.deleteError = true
		
	
	App.controller "AdminCreateSubscriptionController", ($scope) ->
		$scope.subscription =
			customAccount: true,
			groupPlan: true,
			planCode: "professional",
			membersLimit: 10,
			admin_id: window.data.admin_id

		$scope.onSuccess = (result) ->
			subscription = result.data.subscription
			location = "/admin/user/#{subscription.admin_id}/subscription/#{subscription._id}"
			window.location = location
				

