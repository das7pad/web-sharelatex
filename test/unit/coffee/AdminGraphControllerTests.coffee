sinon = require('sinon')
chai = require('chai')
should = chai.should()
expect = chai.expect
modulePath = "../../../app/js/AdminGraphController.js"
SandboxedModule = require('sandboxed-module')
events = require "events"
ObjectId = require("mongojs").ObjectId
assert = require("assert")
Path = require "path"

describe "AdminGraphController", ->
	beforeEach ->

		@UserGetter =
			getUser: sinon.stub()

		@AdminGraphController = SandboxedModule.require modulePath, requires:
			"logger-sharelatex": 
				log:->
				err:->
			"../../../../app/js/Features/User/UserGetter":@UserGetter
			"../../../../app/js/infrastructure/mongojs":
				db: @db =
					projects: {}
					users: {}
				ObjectId: ObjectId

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

			@AdminGraphController._nextLevel = sinon.stub().callsArgWith(3, null, @emptyGraph)

		it "should render the graph page", (done)->
			@res.render = (pageName, opts)=>
				pageName.should.equal  Path.resolve(__dirname + "../../../../")+ "/app/views/userGraph"
				done()
			@AdminGraphController.userGraph @req, @res

		it "should send the user", (done)->
			@res.render = (pageName, opts)=>
				opts.user.should.deep.equal @users[0]
				done()
			@AdminGraphController.userGraph @req, @res

		it "should send the user graph", (done)->
			@res.render = (pageName, opts)=>
				opts.graph.should.deep.equal @emptyGraph
				done()
			@AdminGraphController.userGraph @req, @res

	describe "_addSigmaJSNode", ->

		it "should add a new node", (done)-> 
			nodes = @AdminGraphController._addSigmaJSNode [], 'ref', 'label', 'color'
			assert.equal nodes.length, 1
			done()

		it "should add a node with label", (done)-> 
			nodes = @AdminGraphController._addSigmaJSNode [], 'ref', 'label', 'color'
			assert.equal nodes[0].label, 'label'
			done()

		it "should add a node with color", (done)-> 
			nodes = @AdminGraphController._addSigmaJSNode [], 'ref', 'label', 'color'
			assert.equal nodes[0].color, 'color'
			done()

		it "shouldn't add a existing node", (done)-> 
			nodes = @AdminGraphController._addSigmaJSNode [{id:'ref'}], 'ref', 'label', 'color'
			assert.equal nodes.length, 1
			done()

	describe "_genSigmaJSGraph", ->

		beforeEach ->

			@AdminGraphController._addSigmaJSNode = sinon.stub().withArgs(4).returns(@nodes)

		it "should create graph with three nodes", (done)-> 
			@AdminGraphController._genSigmaJSGraph @projects, [@users[0]._id.toString()], @emptyGraph, (err, graph) ->
				assert.equal graph.nodes.length, 3
				done()

		it "should create graph with five edges", (done)-> 
			@AdminGraphController._genSigmaJSGraph @projects, [@users[0]._id.toString()], @emptyGraph, (err, graph) ->
				assert.equal graph.edges.length, 4
				done()

		it "should create graph with id in all edges", (done)-> 
			@AdminGraphController._genSigmaJSGraph @projects, [@users[0]._id.toString()], @emptyGraph, (err, graph) ->
				for edge in graph.edges
					should.exist edge.id
				done()

	describe "_nextLevel", ->

		beforeEach ->

			@OneLevelGraph = {
				nodes: @nodes,
				edges: [1,2,3,4]
			}

			@AdminGraphController._genSigmaJSGraph = sinon.stub().callsArgWith(3, null, @OneLevelGraph)
			@AdminGraphController._getNames = sinon.stub().callsArgWith(1, null, @OneLevelGraph)

		it "should create 1-level graph", (done)-> 
			@AdminGraphController._nextLevel [@users[0]._id.toString()], @emptyGraph, 1, (err, graph) ->
				assert.equal graph.nodes.length, 3
				done()

	describe "_getNames", ->

		it "should add name to nodes", (done)-> 
			@AdminGraphController._getNames {@nodes, edges:[]}, (err, graph) ->
				for node in graph.nodes
					node.label.should.not.equal ''
				done()