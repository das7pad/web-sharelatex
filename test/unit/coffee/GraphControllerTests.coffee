sinon = require('sinon')
chai = require('chai')
should = chai.should()
expect = chai.expect
modulePath = "../../../app/js/GraphController.js"
SandboxedModule = require('sandboxed-module')
events = require "events"
ObjectId = require("mongojs").ObjectId
assert = require("assert")
Path = require "path"

describe "GraphController", ->
	beforeEach ->

		@UserGetter =
			getUser: sinon.stub()

		@SigmaJSGraph = 
			nodes: []
			edges: []
			addNode: sinon.stub()
			addEdge: sinon.stub()
			new: sinon.stub()

		@GraphController = SandboxedModule.require modulePath, requires:
			"logger-sharelatex": 
				log:->
				err:->
			"../../../../app/js/Features/User/UserGetter":@UserGetter
			"../../../../app/js/infrastructure/mongojs":
				db: @db =
					projects: {}
					users: {}
				ObjectId: ObjectId
			"./SigmaJSGraph": @SigmaJSGraph

		@users = [
			{_id:ObjectId(),first_name:'James'}, 
			{_id:ObjectId(), first_name:'Henry'},
			{_id:ObjectId(), first_name:'Teddy'},
			{_id:ObjectId(), first_name:'Harry'}
		]

		@projects = [
			{_id:1, owner_ref: @users[0]._id, readOnly_refs: [], collaberator_refs: []}, 
			{_id:2, owner_ref: @users[0]._id, readOnly_refs: @users[2]._id, collaberator_refs: @users[3]._id},
			{_id:3, owner_ref: @users[0]._id, readOnly_refs: @users[1]._id, collaberator_refs: []},
			{_id:4, owner_ref: @users[1]._id, readOnly_refs: @users[0]._id, collaberator_refs: []},
		]

		@db.projects.find = sinon.stub().callsArgWith(2, null, @projects)
		@db.users.find = sinon.stub().callsArgWith(2, null, @users)
		@UserGetter.getUser = (user_id, fields, callback) =>
			callback null, @users[0]

		@emptyGraph = 
			nodes: []
			edges: []

		@nodes = [
			{id:@users[0]._id.toString(), label:''}, 
			{id:@users[1]._id.toString(), label:''},
			{id:@users[2]._id.toString(), label:''}
		]

		@req = 
			params:
				user_id: 'user_id_here'
			query:
				SecondLevel: false

		@res = 
			locals:
				jsPath:"js path here"

		@callback = sinon.stub()

	describe "userGraph", ->

		beforeEach ->

			@GraphController._nextLevel = sinon.stub().callsArgWith(3, null, @SigmaJSGraph)

		it "should render the graph page", (done)->
			@res.render = (pageName, opts)=>
				pageName.should.equal  Path.resolve(__dirname + "/../../../")+ "/app/views/user/graph"
				done()
			@GraphController.userGraph @req, @res

		it "should send the user", (done)->
			@res.render = (pageName, opts)=>
				opts.user.should.deep.equal @users[0]
				done()
			@GraphController.userGraph @req, @res

		it "should send the user graph", (done)->
			@res.render = (pageName, opts)=>
				opts.graph.should.deep.equal @SigmaJSGraph
				done()
			@GraphController.userGraph @req, @res

	describe "_genGraph", ->

		beforeEach ->

		it "should create graph with nodes", (done)-> 
			@GraphController._genGraph @projects, [@users[0]._id.toString()], @SigmaJSGraph, (err, graph) ->
				graph.nodes.should.exists
				done()

		it "should create graph with edges", (done)-> 
			@GraphController._genGraph @projects, [@users[0]._id.toString()], @SigmaJSGraph, (err, graph) ->
				graph.edges.should.exists
				done()

	describe "_nextLevel", ->

		beforeEach ->

			@OneLevelGraph = {
				nodes: @nodes,
				edges: [1,2,3,4]
			}

			@GraphController._genGraph = sinon.stub().callsArgWith(3, null, @OneLevelGraph)
			@GraphController._getNames = sinon.stub().callsArgWith(1, null, @OneLevelGraph)

		it "should create 1-level graph", (done)-> 
			@GraphController._nextLevel [@users[0]._id.toString()], @emptyGraph, 1, (err, graph) ->
				assert.equal graph.nodes.length, 3
				done()

	describe "_getNames", ->

		it "should add name to nodes", (done)-> 
			@GraphController._getNames {@nodes, edges:[]}, (err, graph) ->
				for node in graph.nodes
					node.label.should.not.equal ''
				done()
