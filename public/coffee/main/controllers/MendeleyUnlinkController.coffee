define [
	"base"
], (App) ->
	App.controller "MendeleyUnlinkController", ($scope, $modal) ->
		$scope.unlinkAccount = () ->
			$modal.open({
				templateUrl: "mendeleyUnlinkModalTemplate"
			})