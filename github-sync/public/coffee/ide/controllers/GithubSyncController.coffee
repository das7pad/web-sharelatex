define [
	"base"
], (App) ->
	App.controller "GithubSyncController", ($scope) ->
		$scope.openGithubSyncModal = () ->
			console.log "opening modal"