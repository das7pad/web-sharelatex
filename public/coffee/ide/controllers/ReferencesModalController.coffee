define [
	"base"
], (App) ->
	App.controller "ReferencesModalController", ($scope, $modalInstance, $http, $modal, $window, $interval, $timeout, event_tracking, ide, provider, sixpack) ->

		event_tracking.send("references-#{provider}", "modal", "open")

		$scope.provider = provider
		$scope.userHasProviderFeature = ide.$scope.user?.features?.references
		$scope.userHasProviderLink = ide.$scope.user?.refProviders?[provider]

		$scope.bibtexData = null
		$scope.status = {
			loading: false
			error: false
			errorType: 'default'  # || 'expired' || 'forbidden'
			done: false
		}

		$scope.$on 'modal.closing', () ->
			event_tracking.send("references-#{provider}", "modal", "close")

		$scope.cancel = () ->
			$modalInstance.dismiss()

		# TODO: reduce duplication, use FreeTrialModalController.startFreeTrial
		$scope.startFreeTrial = (source) ->
			plan = 'collaborator_free_trial_7_days'
			ga?('send', 'event', 'subscription-funnel', 'upgraded-free-trial', source)
			w = window.open()
			go = () ->
				$scope.startedFreeTrial = true
				w.location = "/user/subscription/new?planCode=#{plan}&ssp=true"
			if $scope.shouldABTestPlans
				sixpack.participate 'plans-1610', ['default', 'heron', 'ibis'], (chosenVariation, rawResponse)->
					if chosenVariation in ['heron', 'ibis']
						plan = "collaborator_#{chosenVariation}"
					go()
			else
				go()

		$scope.linkAccount = () ->
			authWindow = $window.open("/#{provider}/oauth", "reference-auth", "width=700,height=500")
			event_tracking.send("references-#{provider}", "modal", "start-link-account")
			poller = $interval () ->
				# We can get errors when trying to access the URL before it returns
				# to a ShareLaTeX URL (security exceptions)
				try
					pathname = authWindow?.location?.pathname
				catch e
					pathname = null
				if pathname == "/user/settings"
					authWindow.close()
					event_tracking.send("references-#{provider}", "modal", "end-link-account")
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
			$scope.status.done = false
			$scope.status.errorType = 'default'
			event_tracking.send("references-#{provider}", "modal", "load-bibtex")

			$http.get("/#{provider}/bibtex")
				.success (data) ->
					limit = 1 * 1024 * 1024
					if data.length > limit
						$scope.bibtexData = "#{data.slice(0, limit)}\n..."
					else
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
			event_tracking.send("references-#{provider}", "modal", "import-bibtex")
			$scope.status.importing = true
			$http.post(
				"/project/#{ide.project_id}/#{provider}/bibtex/import",
				{_csrf: window.csrfToken}
			)
				.success (data) ->
					$scope.status.error = false
					$scope.status.importing = false
					$scope.$emit 'references:should-reindex', {}
					$scope.status.done = true
					$timeout($scope.cancel, 1200)
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
