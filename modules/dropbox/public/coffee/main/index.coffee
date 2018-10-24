define [
	"base"
], (App) ->


	App.controller "DropboxRegistrationController", ($scope, $window, $http, $timeout) ->
		sliceLocation = window.location.hash.indexOf("access_token")
		data = 
			_csrf : window.csrfToken
			tokenInfo : window.location.hash.slice(sliceLocation)
		$scope.state = "processing"
		$http.post("/dropbox/completeRegistration", data)
			.then () ->
				$scope.state = "success"
				redirect = -> $window.location.href = "/user/settings"
				$timeout redirect, 5000			
			.catch () ->
				$scope.state = "error"
				console.log "the request failed"
			
		