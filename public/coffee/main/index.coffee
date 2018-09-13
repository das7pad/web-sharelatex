define [
	"base"
], (App) ->

	# For integration-module
	App.controller "OverleafAccountMergeCheckerController", ($scope) ->
		$scope.hasOlAccount = null
