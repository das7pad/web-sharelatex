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

		$scope.selectItem = () ->

		$scope.accept = () ->
			console.log ">> accept search result"

		$scope.cancel = () ->
			$modalInstance.dismiss('cancel')
