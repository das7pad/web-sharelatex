define [
	"base"
], (App) ->

	App.controller "openInSlController", ($scope, $http, $window, $timeout) ->

		$scope.openInSlText = "Open in ShareLaTeX"
		$scope.isDisabled = false
		$scope.state =
			unpublishInFlight: false
			republishInFlight: false
			apiProblem: false

		$scope.buttonsDisabled = () ->
			$scope.state.unpublishInFlight or $scope.state.republishInFlight

		$scope.open = ->
			$scope.openInSlText = "Creating..."
			$scope.isDisabled = true
			ga('send', 'event', 'template-site', 'open-in-sl', $('.page-header h1').text())

		$scope.downloadZip = ->
			ga('send', 'event', 'template-site', 'download-zip', $('.page-header h1').text())

		$scope.republish = (projectId) ->
			$scope.state.republishInFlight = true
			$http
				.post("/project/#{projectId}/template/publish", {
					_csrf: window.csrfToken
				})
				.success () ->
					$scope.state.republishInFlight = false
					$scope.state.apiProblem = false
					$window.location.reload()  # Reload this page
				.error () ->
					$scope.state.republishInFlight = false
					$scope.state.apiProblem = false

		$scope.unpublish = (projectId) ->
			$scope.state.unpublishInFlight = true
			$http
				.post("/project/#{projectId}/template/unpublish", {
					_csrf: window.csrfToken
				})
				.success () ->
					$scope.state.unpublishInFlight = false
					$scope.state.apiProblem = false
					$timeout(
						() ->
							$window.location.href = '/templates'
						,
						500
					)
				.error () ->
					$scope.state.unpublishInFlight = false
					# TODO: error handling
					console.log '>> unpub failed'
					$scope.state.apiProblem = true

	App.factory "algolia", ->
		if window?.sharelatex?.algolia?.app_id?
			client = new AlgoliaSearch(window.sharelatex.algolia?.app_id, window.sharelatex.algolia?.api_key)
			index = client.initIndex(window.sharelatex.algolia?.indexes?.templates)
			return index



	App.controller "SearchController", ($scope, algolia, _, $window) ->
		$scope.hits = []

		$scope.showSearch = $window.sharelatex.algolia?.indexes?.templates?

		$scope.clearSearchText = ->
			$scope.searchQueryText = ""
			updateHits []

		$scope.safeApply = (fn)->
			phase = $scope.$root.$$phase
			if(phase == '$apply' || phase == '$digest')
				$scope.$eval(fn)
			else
				$scope.$apply(fn)

		buildHitViewModel = (hit)->
			result =
				name : hit._highlightResult.name.value
				description: hit._highlightResult.description.value
				url :"/templates/#{hit._id}"
				image_url: "#{window.sharelatex?.templates?.cdnDomain}/#{hit._id}/v/#{hit.version}/pdf-converted-cache/style-thumbnail"

		updateHits = (hits)->
			$scope.safeApply ->
				$scope.hits = hits

		$scope.search = ->
			query = $scope.searchQueryText
			if !query? or query.length == 0
				updateHits []
				return

			query = "#{window.sharelatex?.templates?.user_id} #{query}"
			algolia.search query, (err, response)->
				if response.hits.length == 0
					updateHits []
				else
					hits = _.map response.hits, buildHitViewModel
					updateHits hits


	App.controller "MissingTemplateController", ($scope, $modal)->
		$scope.showMissingTemplateModal = ->
			$modal.open {
				templateUrl: "missingTemplateModal"
				controller:"MissingTemplateModalController"
			}

	App.controller "MissingTemplateModalController", ($scope, $modalInstance) ->
		$scope.cancel = () ->
			$modalInstance.dismiss()
