define [
	"base"
], (App) ->
	App.controller "ReferencesSearchModalController", ($scope, $modalInstance, $http, $modal, $window, $interval, ide, provider) ->
		$scope.provider = provider

		console.log ">> init ReferencseSearchModalController"
