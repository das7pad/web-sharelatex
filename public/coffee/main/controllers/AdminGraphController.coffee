define [
	"base",
	"libs/md5",
], (App, md5) ->

	App.controller "AdminGraphController", ($scope, $timeout, $location) ->
		$scope.user = window.data.user
		$scope.user.gravatar =  CryptoJS.MD5($scope.user.email).toString()
		url = $location.absUrl()
		$scope.level = url.substr(url.indexOf('level=')+6,1)

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