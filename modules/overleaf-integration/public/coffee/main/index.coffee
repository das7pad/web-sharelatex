define [
	"base"
], (App) ->

	# For integration-module
	App.controller "OverleafAccountMergeCheckerController", ($scope, $http) ->
		$scope.hasSlAccount = null
		$scope.slEmail = ""
		$scope.errorCode = null
		$scope.success = null

		$scope.submitEmail = () ->
			return if !$scope.slEmail
			data = {
				sharelatexEmail: $scope.slEmail,
				_csrf: window.csrfToken
			}
			$scope.errorCode = null
			$http.post("/account-merge/email/sharelatex", data)
				.then (resp) ->
					$scope.errorCode = null
					$scope.success = true
				.catch (resp) ->
					$scope.errorCode = resp?.data?.errorCode || 'default_error'
					$scope.success = false
