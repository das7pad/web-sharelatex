/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let GraphController;
const logger = require("logger-sharelatex");
const _ = require("underscore");
const Path = require("path");
const UserGetter = require("../../../../app/js/Features/User/UserGetter");
const mongojs = require("../../../../app/js/infrastructure/mongojs");
const {
    db
} = mongojs;
const {
    ObjectId
} = mongojs;
const sigmaGraph = require("./SigmaJSGraph");

module.exports = (GraphController = {
	unknownName: 'unknown',

	_nextLevel(usersObjId, graphPrev, level, cb) {
		logger.log({whichLevel:level}, "calling _nextLevel");

		const idsToSearch = []; 
		if (graphPrev.nodes.length > 0) {
			//create a list with nodes not searched
			for (let node of Array.from(graphPrev.nodes)) {
				if (usersObjId.indexOf(node.id) === -1) {
					idsToSearch.push(ObjectId(node.id));
					usersObjId.push(node.id);
				}
			}
		} else {
			// create a list with the seed
			idsToSearch.push(ObjectId(usersObjId[0]));
		}

		const q = [{owner_ref:{ $in : idsToSearch }}, {readOnly_refs:{ $in : idsToSearch }}, {collaberator_refs:{ $in : idsToSearch }}];
		return db.projects.find({$or : q}, {_id:1, owner_ref:1, readOnly_refs:1, collaberator_refs:1, name:1}, function(err, relations) {
			if (err != null) {
				return cb(err);
			}
			return GraphController._genGraph(relations, usersObjId, graphPrev, (err, graphNext) => GraphController._getNames(graphNext, function(err, graphNamed){
                if (level-1) {
                    return GraphController._nextLevel(usersObjId, graphNamed, level-1, (err, graphLevel) => cb(null, graphLevel));
                } else {
                    return cb(null, graphNamed);
                }
            }));
		});
	},

	_genGraph(relations, usersObjId, graph, cb) {
		let collaberatorColor;
		logger.log("calling _genGraph");

		// usersObjId[0], seed user node : orange
		let readOnlyColor = (collaberatorColor = '');
		if (usersObjId.length === 1) {
			graph.addNode(usersObjId[0], GraphController.unknownName, '#FFA500');
			readOnlyColor = '#0000FF';
			collaberatorColor = '#458B00';
		}

		// create the node and edge list
		for (let edge of Array.from(relations)) {
			var ref;
			const projectNodes = [];

			// default color for owner not related with seed user
			let ownerColor = '';

			// readOnly user node: blue
			for (ref of Array.from(edge.readOnly_refs)) {
				graph.addNode(ref, GraphController.unknownName, readOnlyColor);
				projectNodes.push(ref.toString());
				if (ref.toString() === usersObjId[0]) {
					ownerColor = readOnlyColor;
				}
			}

			// collaberator user node: green
			for (ref of Array.from(edge.collaberator_refs)) {
				graph.addNode(ref, GraphController.unknownName, collaberatorColor);
				projectNodes.push(ref.toString());
				if (ref.toString() === usersObjId[0]) {
					ownerColor = collaberatorColor;
				}
			}

			// switch owner color depends on seed user permission in this project
			graph.addNode(edge.owner_ref, GraphController.unknownName, ownerColor);
			projectNodes.push(edge.owner_ref.toString());

			// generate a complete graph for this project 
			const projectNodesT = projectNodes.slice(0);
			for (let nodeS of Array.from(projectNodes)) {
				projectNodesT.shift();
				for (let nodeT of Array.from(projectNodesT)) {
					graph.addEdge(nodeS, nodeT, edge);
				}
			}
		}

		return cb(null, graph);
	},

	_getNames(graph, cb) {
		// create a list to get users name
		let node;
		const usersObjId = [];
		for (node of Array.from(graph.nodes)) {
			if (node.label === GraphController.unknownName) {
				usersObjId.push(ObjectId(node.id));
			}
		}

		return db.users.find({_id : { $in : usersObjId } }, {first_name:1}, function(err, users){
			if (err != null) {
				logger.err({err}, "error getting users name in admin graphGen");
				return cb(err);
			}

			for (let user of Array.from(users)) {
				for (node of Array.from(graph.nodes)) {
					if (node.id === user._id.toString()) {
						node.label = user.first_name;
					}
				}
			}

			return cb(null, graph);
		});
	},

	userGraph(req, res, next){
		logger.log("getting admin request for user graph");
		return UserGetter.getUser(req.params.user_id, { _id:1, first_name:1, last_name:1, email:1}, function(err, user) {
			let Level;
			const userObjId = req.params.user_id;
			if ((req.query.level == null)) {
				Level = 1;
			} else {
				Level = req.query.level;
			}
			return GraphController._nextLevel([userObjId], sigmaGraph.new() , Level, function(err, graph) {
				if (err != null) {
					return next(err);
				}
				logger.log({graph}, "graph");
				return res.render(Path.resolve(__dirname, "../views/user/graph"), {user, graph});
			});
		});
	}
});
