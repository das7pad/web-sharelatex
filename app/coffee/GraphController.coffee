logger = require "logger-sharelatex"
_ = require "underscore"
Path = require("path")
UserGetter = require "../../../../app/js/Features/User/UserGetter"
mongojs = require("../../../../app/js/infrastructure/mongojs")
db = mongojs.db
ObjectId = mongojs.ObjectId
sigmaGraph = require("./SigmaJSGraph")

module.exports = GraphController =
	unknownName: 'unknown'

	_nextLevel: (usersObjId, graphPrev, level, cb) ->
		logger.log whichLevel:level, "calling _nextLevel"

		idsToSearch = [] 
		if graphPrev.nodes.length > 0
			#create a list with nodes not searched
			for node in graphPrev.nodes
				if usersObjId.indexOf(node.id) == -1
					idsToSearch.push(ObjectId(node.id))
					usersObjId.push(node.id)
		else
			# create a list with the seed
			idsToSearch.push(ObjectId(usersObjId[0]))

		q = [{owner_ref:{ $in : idsToSearch }}, {readOnly_refs:{ $in : idsToSearch }}, {collaberator_refs:{ $in : idsToSearch }}]
		db.projects.find {$or : q}, {_id:1, owner_ref:1, readOnly_refs:1, collaberator_refs:1, name:1}, (err, relations) ->
			if err?
				return cb(err)
			GraphController._genGraph relations, usersObjId, graphPrev, (err, graphNext) ->
				GraphController._getNames graphNext, (err, graphNamed)->
					if level-1
						GraphController._nextLevel usersObjId, graphNamed, level-1, (err, graphLevel) ->
							return cb(null, graphLevel)
					else
						return cb(null, graphNamed)

	_genGraph: (relations, usersObjId, graph, cb) ->
		logger.log "calling _genGraph"

		# usersObjId[0], seed user node : orange
		readOnlyColor = collaberatorColor = ''
		if usersObjId.length == 1
			graph.addNode usersObjId[0], GraphController.unknownName, '#FFA500'
			readOnlyColor = '#0000FF'
			collaberatorColor = '#458B00'

		# create the node and edge list
		for edge in relations
			projectNodes = []

			# default color for owner not related with seed user
			ownerColor = ''

			# readOnly user node: blue
			for ref in edge.readOnly_refs
				graph.addNode ref, GraphController.unknownName, readOnlyColor
				projectNodes.push(ref.toString())
				if ref.toString() == usersObjId[0]
					ownerColor = readOnlyColor

			# collaberator user node: green
			for ref in edge.collaberator_refs
				graph.addNode ref, GraphController.unknownName, collaberatorColor
				projectNodes.push(ref.toString())
				if ref.toString() == usersObjId[0]
					ownerColor = collaberatorColor

			# switch owner color depends on seed user permission in this project
			graph.addNode edge.owner_ref, GraphController.unknownName, ownerColor
			projectNodes.push(edge.owner_ref.toString())

			# generate a complete graph for this project 
			projectNodesT = projectNodes.slice(0)
			for nodeS in projectNodes
				projectNodesT.shift()
				for nodeT in projectNodesT
					graph.addEdge nodeS, nodeT, edge

		return cb(null, graph)

	_getNames: (graph, cb) ->
		# create a list to get users name
		usersObjId = []
		for node in graph.nodes
			if node.label == GraphController.unknownName
				usersObjId.push(ObjectId(node.id))

		db.users.find {_id : { $in : usersObjId } }, {first_name:1}, (err, users)->
			if err?
				logger.err err:err, "error getting users name in admin graphGen"
				return cb(err)

			for user in users
				for node in graph.nodes
					if node.id == user._id.toString()
						node.label = user.first_name

			return cb(null, graph)

	userGraph: (req, res, next)->
		logger.log "getting admin request for user graph"
		UserGetter.getUser req.params.user_id, { _id:1, first_name:1, last_name:1, email:1}, (err, user) ->
			userObjId = req.params.user_id
			if !req.query.level?
				Level = 1
			else
				Level = req.query.level
			GraphController._nextLevel [userObjId], sigmaGraph.new() , Level, (err, graph) ->
				if err?
					return next(err)
				logger.log graph:graph, "graph"
				res.render Path.resolve(__dirname, "../views/user/graph"), user:user, graph:graph
