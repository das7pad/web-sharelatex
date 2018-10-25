
define [
	"base"
], (App) ->

	App.controller "MendeleyLinkedFileModalController", [
		"$scope", "ide", "$timeout", "$window", "$interval", "event_tracking", "sixpack"
		($scope,   ide,   $timeout,   $window,   $interval,   event_tracking,   sixpack) ->

			provider = 'mendeley'
			features = ide.$scope.user?.features
			$scope.userHasProviderFeature = features?.mendeley or features?.references
			$scope.userHasProviderLink = ide.$scope.user?.refProviders?[provider]

			$scope.canLoadBibtex = () ->
				$scope.userHasProviderFeature && $scope.userHasProviderLink

			$scope.state =
				fetchingGroups: false
				inflight: false
				error: false
				errorType: 'default'  # || 'expired' || 'forbidden'
			$scope.data =
				isInitialized: false
				groups: null
				selectedGroupId: null

			_handleError = (err) ->
				if err.status == 401
					_reset(error: 'expired')
				else if err.status == 403
					_reset(error: 'forbidden')
				else if err.status == 400
					_reset(error: 'default')
				else
					_reset(error: true)

			_reset = (opts={}) ->
				$scope.state.fetchingGroups = false
				$scope.state.fetchingBibtexPreview = false
				$scope.state.inflight = false
				if opts.error?
					$scope.state.error = true
					if opts.error == true
						$scope.state.errorType = 'default'
					else
						$scope.state.errorType = opts.error
				else
					$scope.state.error = false

			$scope.hasGroups = () ->
				$scope.data.groups? && $scope.data.groups.length > 0

			$scope.fetchGroups = () ->
				return unless $scope.canLoadBibtex()
				_reset()
				$scope.state.fetchingGroups = true
				ide.$http.get("/mendeley/groups", {disableAutoLoginRedirect: true})
					.then (resp) ->
						{ data } = resp
						$scope.data.groups = data.groups
						# $scope.data.groups = [] # DEBUG
						$scope.data.selectedGroup = null
						$scope.data.isInitialized = true
						_reset()
					.catch (err) ->
						console.warn err
						_handleError(err)

			validate = () ->
				{name, isInitialized} = $scope.data
				if !name? or name.length == 0
					$scope.state.valid = false
				else if !isInitialized? 
					$scope.state.valid = false
				else
					$scope.state.valid = true

			$scope.$watch 'data.name', validate

			$scope.$on 'create', () ->
				return unless $scope.data.isInitialized
				return unless (
					$scope.data.isInitialized &&
					$scope.data.name
				)
				if $scope.hasGroups()
					# Import from selected Group
					if $scope.data.selectedGroupId
						payload = {
							group_id: $scope.data.selectedGroupId
						}
					else
						payload = {}
				else
					# Import from Account
					payload = {}
				event_tracking.send("references-mendeley", "modal", "import-bibtex")
				$scope.state.inflight = true
				ide.fileTreeManager
					.createLinkedFile($scope.data.name, $scope.parent_folder, 'mendeley', payload)
					.then () ->
						$scope.$emit 'references:should-reindex', {}
						$scope.$emit 'done'
						_reset()
					.catch (err) ->
						_handleError(err)

			_init = () ->
				return unless $scope.canLoadBibtex()
				$scope.state.fetchingGroups = true
				$timeout(
					() ->
						$scope.fetchGroups()
					, 500
				)
			_init()

			# Stuff for managing trials and linkages
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
							$scope.fetchGroups()
							, 500
						)
						$interval.cancel(poller)
				, 1000
				return true # See https://github.com/angular/angular.js/issues/4853#issuecomment-28491586


			window._S = $scope
	]