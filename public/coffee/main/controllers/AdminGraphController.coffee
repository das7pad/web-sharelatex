define [
	"base",
	"libs/md5",
	"http://cdn.imnjb.me/libs/sigma.js/1.0.2/sigma.min.js",
	"http://cdn.imnjb.me/libs/sigma.js/1.0.2/plugins/sigma.layout.forceAtlas2.min.js"
], (App) ->

	App.controller "AdminGraphController", ($scope, $timeout) ->
		$scope.user = window.data.user
		$scope.graph = window.data.graph
		$scope.user.gravatar =  CryptoJS.MD5($scope.user.email).toString()

		$scope.config = 
			container: 'graph'
			settings:
				defaultNodeColor: '#ec5148'


		s = new sigma $scope.config
		s.graph.read $scope.graph
		s.startForceAtlas2({worker: true, barnesHutOptimize: false})
		s.refresh()