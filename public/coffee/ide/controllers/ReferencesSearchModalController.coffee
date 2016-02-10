define [
	"base"
], (App) ->
	App.controller "ReferencesSearchModalController", ($scope, $modalInstance, $http, $window, $interval, ide) ->

		console.log $modalInstance

		$scope.state =
			queryText: ""
			searchResults: null
			selected: null
			currentlySearching: false

		$scope.doSearch = () ->
			console.log ">> doing search"
			opts =
				query: $scope.state.queryText
				_csrf: window.csrfToken
			$.post(
				"/project/#{$scope.project_id}/references/search",
				opts,
				(data) ->
					console.log data
					$scope.state.searchResults = data.hits
					$scope.$digest()
			)

		$scope.selectItem = () ->

		$scope.accept = () ->
			console.log ">> accept search result"

		$scope.cancel = () ->
			$modalInstance.dismiss('cancel')
