define [
	"base"
], (App) ->
	App.controller "ReferencesSearchModalController", ($scope, $modalInstance, $http, $window, $interval, ide) ->

		$scope.queryText = ""
		$scope.searchResults = []
		$scope.selected = null
		$scope.currentlySearching = false

		$scope.doSearch = () ->
			console.log ">> doing search"
			opts =
				query: $scope.queryText
				_csrf: window.csrfToken
			$.post(
				"/project/#{$scope.project_id}/references/search",
				opts,
				(data) =>
					console.log ">> got search results", data
					@_storeReferencesKeys(data)
			)


		$scope.selectItem = () ->

		$scope.accept = () ->
			console.log ">> accept search result"

		$scope.cancel = () ->
			$modalInstance.dismiss('cancel')
