define [
	"base"
], (App) ->
	App.controller "ReferencesModalController", ($scope, $modalInstance, $http, $modal, $window, $interval, $timeout, ide, provider) ->

		$scope.provider = provider
		$scope.userHasProviderFeature = ide.$scope.user?.features?.references
		$scope.userHasProviderLink = ide.$scope.user?.refProviders?[provider]

		$scope.bibtexData = null
		$scope.status = {
			loading: false
			error: false
			errorType: 'default'  # || 'expired' || 'forbidden'
		}

		$scope.cancel = () ->
			$modalInstance.dismiss()

		$scope.startFreeTrial = (source) ->
			ga?('send', 'event', 'subscription-funnel', 'upgraded-free-trial', source)
			window.open("/user/subscription/new?planCode=student_free_trial_7_days")
			$scope.startedFreeTrial = true

		$scope.linkAccount = () ->
			authWindow = $window.open("/#{provider}/oauth", "reference-auth", "width=700,height=500")
			poller = $interval () ->
				# We can get errors when trying to access the URL before it returns
				# to a ShareLaTeX URL (security exceptions)
				try
					pathname = authWindow?.location?.pathname
				catch e
					pathname = null
				if pathname == "/user/settings"
					authWindow.close()
					$scope.userHasProviderLink = true
					ide.$scope.user.refProviders[provider] = true
					$timeout(
						() ->
							$scope.loadBibtex()
						, 400
					)
					$interval.cancel(poller)
			, 1000
			return true # See https://github.com/angular/angular.js/issues/4853#issuecomment-28491586

		$scope.loadBibtex = () ->
			$scope.status.loading = true
			$scope.status.error = false
			$scope.status.errorType = 'default'

			$http.get("/#{provider}/bibtex")
				.success (data) ->
					$scope.bibtexData = data
					$scope.status.loading = false
				.error (data, statusCode) ->
					if statusCode == 401
						$scope.status.errorType = 'expired'
					if statusCode == 403
						$scope.status.errorType = 'forbidden'
					if statusCode == 400
						$scope.status.errorType = 'refresh-failed'
					$scope.status.error = true
					$scope.status.loading = false

		$scope.importBibtex = () ->
			if !$scope.bibtexData
				return
			if $scope.status.importing
				return
			$scope.status.importing = true
			$http.post(
				"/project/#{ide.project_id}/#{provider}/bibtex/import",
				{_csrf: window.csrfToken}
			)
				.success (data) ->
					$scope.status.error = false
					$scope.status.importing = false
					$scope.$emit 'references:imported', {}
					$scope.cancel()
				.error () ->
					$scope.status.error = true
					$scope.status.importing = false

		# automatically load the bibtex from provider when the modal loads
		$timeout(
			() ->
				if $scope.userHasProviderFeature && $scope.userHasProviderLink
					$scope.loadBibtex()
			, 10
		)
