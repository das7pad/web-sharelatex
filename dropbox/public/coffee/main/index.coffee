define [
	"base"
], (App) ->


	App.controller "DropboxRegistrationController", ($scope, $window, $http, $timeout) ->
		data = 
			_csrf : window.csrfToken
			tokenInfo : window.location.hash.slice(2)
		request = $http.post "/dropbox/completeRegistration", data
		$scope.state = "processing"
		request.success (data, status)->
			$scope.state = "success"
			redirect = -> $window.location.href = "/user/settings"
			$timeout redirect, 5000
		request.error (data, status)->
			$scope.state = "error"

			console.log "the request failed"

		