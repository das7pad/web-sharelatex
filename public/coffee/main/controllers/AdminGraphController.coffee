define [
	"base",
	"libs/md5",
	"/js/libs/sigma-v1.0.3/sigma.min.js",
	"/js/libs/sigma-v1.0.3/plugins/sigma.layout.forceAtlas2.min.js",
	"/js/libs/sigma-v1.0.3/plugins/sigma.plugins.dragNodes.min.js"
], (App) ->

	App.controller "AdminGraphController", ($scope, $timeout) ->
		$scope.user = window.data.user
		$scope.user.gravatar =  CryptoJS.MD5($scope.user.email).toString()

		# https://github.com/jacomyal/sigma.js/wiki/Settings
		$scope.config = 
			graph: window.data.graph
			container: 'graph'
			settings:
				defaultNodeColor: '#ccc'
				edgeColor: 'target'

		sigma.renderers.def = sigma.renderers.canvas

		$scope.sGraph = new sigma $scope.config
		$scope.sGraph.startForceAtlas2({worker: true, barnesHutOptimize: false})
		# sigma.plugins.dragNodes($scope.sGraph, $scope.sGraph.renderers[0]);

		$scope.sGraph.refresh()
		
		$timeout () -> 
			$scope.sGraph.stopForceAtlas2() 
		, 2000