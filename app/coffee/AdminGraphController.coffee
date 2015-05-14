logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")
UserGetter = require "../../../../app/js/Features/User/UserGetter"

mongojs = require("../../../../app/js/infrastructure/mongojs")
db = mongojs.db
ObjectId = mongojs.ObjectId

module.exports = AdminGraphController =
	
	_2ndLevel: (graphOne, cb) ->
		usersObjId = []
		for node in graphOne.nodes
			usersObjId.push(ObjectId(node.id))

		q = [{owner_ref:{ $in : usersObjId }}, {readOnly_refs:{ $in : usersObjId }}, {collaberator_refs:{ $in : usersObjId }}]
		db.projects.find {$or : q}, {_id:1, owner_ref:1, readOnly_refs:1, collaberator_refs:1}, (err, relations) ->
			AdminGraphController._genGraph relations, 1, (err, graph2nd) ->
				if err?
					return cb(err)
				for node in graph2nd.nodes
					AdminGraphController._addNode graphOne.nodes, node.id, node.label, '#CCC'
				graphOne.edges = graphOne.edges.concat(graph2nd.edges)	

				cb(null, graphOne)

	_genGraph: (relations, level, cb) ->
		nodes = []
		edges = []

		for edge in relations
			projectNodes = []
			nodes = AdminGraphController._addNode nodes, edge.owner_ref, '', '#FFA500'
			projectNodes.push(edge.owner_ref.toString())
			for ref in edge.readOnly_refs
				nodes = AdminGraphController._addNode nodes, ref, '', '#0000FF'
				edges.push({id:Math.random().toString(), source: edge.owner_ref, target: ref})
				projectNodes.push(ref.toString())
			for ref in edge.collaberator_refs
				nodes = AdminGraphController._addNode nodes, ref, '', '#458B00'
				edges.push({id:Math.random().toString(), source: edge.owner_ref, target: ref})
				projectNodes.push(ref.toString())
			# generate a complete graph for this project, cause an edge overhead number
			for nodeS in projectNodes
				for nodeT in projectNodes
					edges.push({id:Math.random().toString(), source: nodeS, target: nodeT})

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

			if level == 2
				AdminGraphController._2ndLevel {nodes:nodes, edges:edges}, (err, graph) ->
					return cb(null, graph)
			else
				return cb(null, {nodes:nodes, edges:edges})

	_addNode: (nodes, ref, label, color) ->
		exists = false
		coordX = nodes.length
		coordY = Math.floor((Math.random() * 10) + 1);

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
			q = [{owner_ref:userObjId}, {readOnly_refs:userObjId}, {collaberator_refs:userObjId}]
			db.projects.find {$or : q}, {_id:1, owner_ref:1, readOnly_refs:1, collaberator_refs:1}, (err, relations) ->
					AdminGraphController._genGraph relations, 1, (err, graph) ->
						if err?
							return next(err)
						logger.log graph:graph, "graph"
						res.render Path.resolve(__dirname, "../views/userGraph"), user:user, graph:graph
