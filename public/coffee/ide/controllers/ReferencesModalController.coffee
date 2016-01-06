define [
	"base"
], (App) ->
	App.controller "ReferencesModalController", ($scope, $modalInstance, $http, $modal, $window, $interval, ide, provider) ->
		$scope.provider = provider

		$scope.cancel = () ->
			$modalInstance.dismiss()

		$scope.startFreeTrial = (source) ->
			ga?('send', 'event', 'subscription-funnel', 'upgraded-free-trial', source)
			window.open("/user/subscription/new?planCode=student_free_trial_7_days")
			$scope.startedFreeTrial = true
		
		$scope.linkAccount = () ->
			authWindow = $window.open("/" + provider + "/oauth", "reference-auth", "width=700,height=500")
			poller = $interval () ->
				# We can get errors when trying to access the URL before it returns 
				# to a ShareLaTeX URL (security exceptions)
				try
					pathname = authWindow?.location?.pathname
				catch e
					pathname = null
				if authWindow?.location?.pathname == "/user/settings"
					authWindow.close()
					$scope.loadStatus()
					$interval.cancel(poller)
			, 1000
			return true # See https://github.com/angular/angular.js/issues/4853#issuecomment-28491586
			
		do $scope.loadStatus = () ->
			$scope.status = {
				loading: true
				error: false
				reindex: false
				user: false
			}
			
			$http.get("/" + provider + "/reindex")
				.success (data) ->
					$scope.status.reindex = data.reindex
					$scope.status.user = data.user
					$scope.status.loading = false
					
				.error () ->
					$scope.status.error = true
					$scope.status.loading = false