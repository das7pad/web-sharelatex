module.exports = SigmaJSGraph =

	nodes: []
	edges: []

	new: () ->
		this.nodes = []
		this.edges = []
		return this

	addNode: (ref, label, color) ->

		# avoid duplicate nodes
		exists = false
		for node in this.nodes
			if node.id == ref.toString()
				exists = true
				break

		if !exists
			this.nodes.push({
				id:ref.toString(),
				label:label, 
				x:this.nodes.length, 
				y:Math.floor((Math.random() * 10) + 1), 
				size: 2, 
				color:color
			});

	addEdge: (nodeS, nodeT, project) ->

		#create a hash to compare
		if nodeS > nodeT
			hash = nodeS + nodeT + project._id
		else
			hash = nodeT + nodeS + project._id

		# avoid duplicate edges
		exists = false
		for edge in this.edges
			if edge.hash == hash
				exists = true
				break
				
		if !exists
			this.edges.push({
				id:Math.random().toString(), 
				label: project.name, 
				source: nodeS, 
				target: nodeT, 
				type: 'curve', 
				count: Math.floor((Math.random() * 10) + 1),
				size: 2,
				projectId: project._id,
				hash: hash
			})