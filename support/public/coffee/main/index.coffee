define [
	"base"
	"libs/platform"
	"services/algolia-search"
], (App, platform) ->
	App.controller 'ContactModal', ($scope, $modal) ->
		$scope.contactUsModal = () ->
			modalInstance = $modal.open(
				templateUrl: "supportModalTemplate"
				controller: "SupportModalController"
			)

	App.controller 'SupportModalController', ($scope, $modalInstance, algoliaSearch, event_tracking,  $http) ->
		$scope.form = {}
		$scope.sent = false
		$scope.sending = false
		$scope.suggestions = [];

		_handleSearchResults = (success, results) ->
			suggestions = for hit in results.hits
				page_underscored = hit?.pageName?.replace(/\s/g,'_')

				suggestion = 
					url :"/learn/kb/#{page_underscored}"
					name : hit._highlightResult.pageName.value

			event_tracking.sendMB "contact-form-suggestions-shown" if results.hits.length

			$scope.$applyAsync () -> 
				$scope.suggestions = suggestions

		$scope.contactUs = ->
			if !$scope.form.email? or $scope.form.email == ""
				console.log "email not set"
				return
			$scope.sending = true
			ticketNumber = Math.floor((1 + Math.random()) * 0x10000).toString(32)
			message = $scope.form.message
			if $scope.form.project_url?
				message	= "#{message}\n\n project_url = #{$scope.form.project_url}" 
			data =
				_csrf : window.csrfToken
				email: $scope.form.email
				message: message or ""
				subject: $scope.form.subject + " - [#{ticketNumber}]"
				labels: "support"
				about: "<div>browser: #{platform?.name} #{platform?.version}</div>
						<div>os: #{platform?.os?.family} #{platform?.os?.version}</div>"
			request = $http.post "/support", data
			request.then (response)->
				$scope.sent = true
			request.catch ()->
				$scope.error = true
				console.log "the request failed"

		$scope.$watch "form.subject", (newVal, oldVal) ->
			if newVal and newVal != oldVal and newVal.length > 3
				algoliaSearch.searchKB newVal, _handleSearchResults, { 
					hitsPerPage: 3
					typoTolerance: 'strict'
				}
			else
				$scope.suggestions = [];

		$scope.clickSuggestionLink = (url) ->
			event_tracking.sendMB "contact-form-suggestions-clicked", { url }

		$scope.close = () ->
			$modalInstance.close()



