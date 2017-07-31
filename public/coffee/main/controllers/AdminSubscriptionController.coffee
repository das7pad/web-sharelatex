define [
	"base",
	"libs/md5"
], (App) ->
	App.controller "AdminSubscriptionController", ($scope) ->
		$scope.subscription = window.data.subscription
	
	App.controller "AdminCreateSubscriptionController", ($scope) ->
		$scope.subscription = window.data.subscription
		
		$scope.onSuccess = (result) ->
			location = "/admin/subscription/#{result.data.subscription._id}"
			console.log "SUCCESS", result, location
			window.location = location
				

