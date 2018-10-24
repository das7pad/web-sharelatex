define [
	"base",
	"libs/md5",
], (App, md5) ->

	App.controller "AdminGraphController", ($scope, $timeout, $location, $modal) ->
		$scope.user = window.data.user
		$scope.user.gravatar =  CryptoJS.MD5($scope.user.email).toString()
		url = $location.absUrl()
		$scope.level = url.substr(url.indexOf('level=')+6,1)

		# https://github.com/jacomyal/sigma.js/wiki/Settings
		$scope.config = 
			graph: window.data.graph
			container: 'graph'
			type: 'canvas'
			settings:
				defaultNodeColor: '#ccc'
				edgeColor: 'target'
				edgeLabelSize: 'proportional'
				enableEdgeHovering: true
				edgeHoverColor: 'edge'
				edgeHoverSizeRatio: 3,

		sigma.renderers.def = sigma.renderers.canvas

		$scope.sGraph = new sigma $scope.config
		$scope.sGraph.startForceAtlas2({worker: true, barnesHutOptimize: false})
		$scope.sGraph.refresh()
		
		# Bind the events:
		$scope.sGraph.bind 'clickNode', (e) ->
			$scope.selectedElement =
				name: e.data.node.label
				id: e.data.node.id
				type: 'User'
				link: '/admin/user/' + e.data.node.id
			$scope.openGraphModal()

		$scope.sGraph.bind 'clickEdge', (e) ->
			$scope.selectedElement =
				name: e.data.edge.label
				id: e.data.edge.projectId
				type: 'Project'
				link: '/admin/project/' + e.data.edge.projectId
			$scope.openGraphModal()


		$timeout () -> 
			$scope.sGraph.stopForceAtlas2() 
		, 500

		$scope.openGraphModal = () ->
			modalInstance = $modal.open(
				templateUrl: "graphModalTemplate"
				controller: "GraphModalController"
				resolve:
					element: () -> $scope.selectedElement
			)

	App.controller 'GraphModalController', ($scope, $modalInstance, element) ->
		$scope.element = element
		$scope.close = () ->
			$modalInstance.close()