logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")
UserGetter = require "../../../../app/js/Features/User/UserGetter"
mongojs = require("../../../../app/js/infrastructure/mongojs")
db = mongojs.db
ObjectId = mongojs.ObjectId

module.exports = AdminGraphController =
	unknownName: 'unknown'

	_nextLevel: (usersObjId, graphPrev, level, cb) ->
		logger.log whichLevel:level, "calling _nextLevel"

		idsToSearch = [] 
		if graphPrev.nodes.length > 0
			#create a list with node not searched
			for node in graphPrev.nodes
				if usersObjId.indexOf(node.id) == -1
					idsToSearch.push(ObjectId(node.id))
					usersObjId.push(node.id)
		else
			# create a list with the seed
			idsToSearch.push(ObjectId(usersObjId[0]))

		q = [{owner_ref:{ $in : idsToSearch }}, {readOnly_refs:{ $in : idsToSearch }}, {collaberator_refs:{ $in : idsToSearch }}]
		db.projects.find {$or : q}, {_id:1, owner_ref:1, readOnly_refs:1, collaberator_refs:1}, (err, relations) ->
			if err?
				return cb(err)
			AdminGraphController._genSigmaJSGraph relations, usersObjId, level, graphPrev, (err, graphNext) ->
				cb(null, graphNext)

	_genSigmaJSGraph: (relations, usersObjId, level, graph, cb) ->
		logger.log whichLevel:level, "calling _genSigmaJSGraph"

		# usersObjId[0], seed user node : orange
		readOnlyColor = collaberatorColor = ''
		if usersObjId.length == 1
			graph.nodes = AdminGraphController._addSigmaJSNode graph.nodes, usersObjId[0], AdminGraphController.unknownName, '#FFA500'
			readOnlyColor = '#0000FF'
			collaberatorColor = '#458B00'

		# create the node and edge list
		for edge in relations
			projectNodes = []

			# default color for owner not related with seed user
			ownerColor = ''

			# readOnly user node: blue
			for ref in edge.readOnly_refs
				graph.nodes = AdminGraphController._addSigmaJSNode graph.nodes, ref, AdminGraphController.unknownName, readOnlyColor
				projectNodes.push(ref.toString())
				if ref.toString() == usersObjId[0]
					ownerColor = readOnlyColor

			# collaberator user node: green
			for ref in edge.collaberator_refs
				graph.nodes = AdminGraphController._addSigmaJSNode graph.nodes, ref, AdminGraphController.unknownName, collaberatorColor
				projectNodes.push(ref.toString())
				if ref.toString() == usersObjId[0]
					ownerColor = collaberatorColor

			# switch owner color depends on seed user permission in this project
			graph.nodes = AdminGraphController._addSigmaJSNode graph.nodes, edge.owner_ref, AdminGraphController.unknownName, ownerColor
			projectNodes.push(edge.owner_ref.toString())

			# generate a complete graph for this project 
			projectNodesT = projectNodes.slice(0)
			for nodeS in projectNodes
				projectNodesT.shift()
				for nodeT in projectNodesT
					graph.edges.push({id:Math.random().toString(), source: nodeS, target: nodeT})


		AdminGraphController._getNames graph, (err, graphNamed)->

			if level-1
				AdminGraphController._nextLevel usersObjId, graphNamed, level-1, (err, graphNext) ->
					return cb(null, graphNext)
			else
				return cb(null, graphNamed)

	_getNames: (graph, cb) ->
		# create a list to get users name
		usersObjId = []
		for node in graph.nodes
			if node.label == AdminGraphController.unknownName
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
			userObjId = req.params.user_id
			if !req.query.level?
				Level = 1
			else
				Level = req.query.level
			AdminGraphController._nextLevel [userObjId], {nodes:[],edges:[]}, Level, (err, graph) ->
				if err?
					return next(err)
				logger.log graph:graph, "graph"
				res.render Path.resolve(__dirname, "../views/userGraph"), user:user, graph:graph
