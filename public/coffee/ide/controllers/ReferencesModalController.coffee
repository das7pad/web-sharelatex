define [
	"base"
], (App) ->
	App.controller "ReferencesModalController", ($scope, $modalInstance, $http, $modal, $window, $interval, $timeout, ide, provider) ->

		$scope.provider = provider
		$scope.userHasProviderFeature = ide.$scope.user?.features?[provider]
		$scope.userHasProviderLink = ide.$scope.user?.refProviders?[provider]

		$scope.bibtexData = null
		$scope.status = {
			loading: false
			error: false
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
					$timeout(
						() ->
							$scope.loadBibtex()
						, 100
					)
					$interval.cancel(poller)
			, 1000
			return true # See https://github.com/angular/angular.js/issues/4853#issuecomment-28491586

		$scope.loadBibtex = () ->
			$scope.status.loading = true
			$scope.status.error = false

			$http.get("/#{provider}/bibtex")
				.success (data) ->
					$scope.bibtexData = data
					$scope.status.loading = false
				.error () ->
					$scope.status.error = true
					$scope.status.loading = false

		$scope.importBibtex = () ->
			if !$scope.bibtexData
				return
			# TODO: make this not suck
			targetFileName = "#{$scope.provider}.bib"
			targetFile = ide.fileTreeManager.findEntityByPath(targetFileName)
			updateFileContents = (target) ->
				_ide.editorManager.openDoc(target)
				$timeout(
					() ->
						editor = window.editors[0]
						if ide.editorManager.getCurrentDocId() == target.id
							editor.setValue($scope.bibtexData)
						else
							console.error "Wrong doc open when trying to input bibtex data into #{target.name}"
					, 500
				)

			if targetFile
				updateFileContents(targetFile)
			else
				ide.fileTreeManager.createDoc(targetFileName).then (response) ->
					# TODO: check status code
					console.log response.data
					newDocId = response.data._id
					$timeout(
						() ->
							targetFile = ide.fileTreeManager.findEntityById(newDocId)
							console.log ">> target is", targetFile
							updateFileContents(targetFile)
						, 0
					)

		# automatically load the bibtex from provider
		$timeout(
			() ->
				if $scope.userHasProviderFeature && $scope.userHasProviderLink
					$scope.loadBibtex()
			, 0
		)
