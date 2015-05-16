logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")
UserGetter = require "../../../../app/js/Features/User/UserGetter"
mongojs = require("../../../../app/js/infrastructure/mongojs")
db = mongojs.db
ObjectId = mongojs.ObjectId

module.exports = AdminGraphController =
	
	_2ndLevel: (mainUserObjId, graphOne, cb) ->
		usersObjId = []

		# create an array with all Ids of previous graph
		for node in graphOne.nodes
			usersObjId.push(ObjectId(node.id))

		q = [{owner_ref:{ $in : usersObjId }}, {readOnly_refs:{ $in : usersObjId }}, {collaberator_refs:{ $in : usersObjId }}]
		db.projects.find {$or : q}, {_id:1, owner_ref:1, readOnly_refs:1, collaberator_refs:1}, (err, relations) ->
			AdminGraphController._genSigmaJSGraph relations, mainUserObjId, false, (err, graph2nd) ->
				if err?
					return cb(err)
				for node in graph2nd.nodes
					graphOne.nodes = AdminGraphController._addSigmaJSNode graphOne.nodes, node.id, node.label, ''

				# really, graph2nd.edges already have graphOne.edges
				# cause previous level owner_ref is in graphOne.nodes
				graphOne.edges = graphOne.edges.concat(graph2nd.edges)	

				cb(null, graphOne)

	_genSigmaJSGraph: (relations, mainUserObjId, Nextlevel, cb) ->
		nodes = []
		edges = []

		# main user node: orange
		nodes = AdminGraphController._addSigmaJSNode nodes, mainUserObjId, 'unknown', '#FFA500'

		# create the node and edge list
		for edge in relations
			projectNodes = []

			# default color for owner not related with main user
			ownerColor = ''

			# readOnly user node: blue
			for ref in edge.readOnly_refs
				nodes = AdminGraphController._addSigmaJSNode nodes, ref, 'unknown', '#0000FF'
				projectNodes.push(ref.toString())
				if ref.toString() == mainUserObjId.toString()
					ownerColor = '#0000FF'

			# collaberator user node: green
			for ref in edge.collaberator_refs
				nodes = AdminGraphController._addSigmaJSNode nodes, ref, 'unknown', '#458B00'
				projectNodes.push(ref.toString())
				if ref.toString() == mainUserObjId.toString()
					ownerColor = '#458B00'

			# switch owner color depends on main user permission in this project
			nodes = AdminGraphController._addSigmaJSNode nodes, edge.owner_ref, 'unknown', ownerColor
			projectNodes.push(edge.owner_ref.toString())

			# generate a complete graph for this project 
			projectNodesT = projectNodes.slice(0)
			for nodeS in projectNodes
				projectNodesT.shift()
				for nodeT in projectNodesT
					edges.push({id:Math.random().toString(), source: nodeS, target: nodeT})

		# create a list to get users name
		usersObjId = []
		for node in nodes
			usersObjId.push(ObjectId(node.id))

		db.users.find {_id : { $in : usersObjId } }, {first_name:1}, (err, users)->
			if err?
				logger.err err:err, "error getting users name in admin graphGen"
				return cb(err)

			for user in users
				for node in nodes
					if node.id == user._id.toString()
						node.label = user.first_name

			if Nextlevel
				AdminGraphController._2ndLevel mainUserObjId, {nodes:nodes, edges:edges}, (err, graph) ->
					return cb(null, graph)
			else
				return cb(null, {nodes:nodes, edges:edges})

	_addSigmaJSNode: (nodes, ref, label, color) ->
		exists = false
		coordX = nodes.length
		coordY = Math.floor((Math.random() * 10) + 1);

		# avoid duplicate nodes
		for node in nodes
			if node.id == ref.toString()
				exists = true
				break

		if !exists
			nodes.push({id:ref.toString(),label:label, x:coordX, y:coordY, size: 2, color:color});
			
		return nodes

	userGraph: (req, res, next)->
		logger.log "getting admin request for user graph"
		UserGetter.getUser req.params.user_id, { _id:1, first_name:1, last_name:1, email:1}, (err, user) ->
			userObjId = ObjectId(req.params.user_id)
			SecondLevel = req.query.SecondLevel?
			q = [{owner_ref:userObjId},{readOnly_refs:userObjId},{collaberator_refs:userObjId}]
			db.projects.find {$or : q}, {_id:1, owner_ref:1, readOnly_refs:1, collaberator_refs:1}, (err, relations) ->
					AdminGraphController._genSigmaJSGraph relations, userObjId, SecondLevel, (err, graph) ->
						if err?
							return next(err)
						logger.log graph:graph, "graph"
						res.render Path.resolve(__dirname, "../views/userGraph"), user:user, graph:graph
