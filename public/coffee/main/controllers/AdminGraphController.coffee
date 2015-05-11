define [
	"base",
	"libs/md5",
	"https://cdnjs.cloudflare.com/ajax/libs/sigma.js/1.0.3/sigma.min.js"
], (App) ->

	App.controller "AdminGraphController", ($scope) ->
		$scope.user = window.data.user
		$scope.graph = window.data.graph
		$scope.user.gravatar =  CryptoJS.MD5($scope.user.email).toString()