logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")
UserGetter = require "../../../../app/js/Features/User/UserGetter"
UserDeleter = require("../../../../app/js/Features/User/UserDeleter")
AuthenticationManager = require("../../../../app/js/Features/Authentication/AuthenticationManager")

mongojs = require("../../../../app/js/infrastructure/mongojs")
db = mongojs.db
ObjectId = mongojs.ObjectId

module.exports = AdminGraphController =

	_genGraph: (relations) ->
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
			# generate a complete graph for this project
			for nodeS in projectNodes
				for nodeT in projectNodes
					edges.push({id:Math.random().toString(), source: nodeS, target: nodeT})

		return {nodes:nodes, edges:edges}

	_addNode: (nodes, ref, name, color) ->
		exists = false
		coordX = nodes.length
		coordY = Math.floor((Math.random() * 10) + 1);

		for node in nodes
			if node.id == ref.toString()
				exists = true
				break

		if !exists
			nodes.push({id:ref.toString(),label:ref, x:coordX, y:coordY, size: 2, color:color});
			
		return nodes

	userGraph: (req, res, next)->
		logger.log "getting admin request for user graph"
		UserGetter.getUser req.params.user_id, { _id:1, first_name:1, last_name:1, email:1}, (err, user) ->
			userObjId = ObjectId(req.params.user_id)
			q = [{owner_ref:userObjId}, {readOnly_refs:userObjId}, {collaberator_refs:userObjId}]
			db.projects.find {$or : q}, {_id:1, owner_ref:1, readOnly_refs:1, collaberator_refs:1}, (err, relations) ->
					if err?
						return next(err)
					graph = AdminGraphController._genGraph relations
					logger.log graph:graph, "graph"
					res.render Path.resolve(__dirname, "../views/userGraph"), user:user, graph:graph
