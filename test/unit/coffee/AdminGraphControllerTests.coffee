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
			{_id:"5542b29b3109c21db2fcde67",first_name:'James'}, 
			{_id:"55530be4ea96f52a21e3bbe8", first_name:'Henry'},
			{_id:"5542b2de3109c21db2fcde6e", first_name:'Teddy'},
			{_id:"553c4e35fd6eddeb9c3aaa06", first_name:'Harry'}
		]

		@projects = [
			{_id:1, owner_ref: "5542b29b3109c21db2fcde67", readOnly_refs: [], collaberator_refs: []}, 
			{_id:2, owner_ref: "5542b29b3109c21db2fcde67", readOnly_refs: ["553c4e35fd6eddeb9c3aaa06"], collaberator_refs: ["5542b2de3109c21db2fcde6e"]},
			{_id:3, owner_ref: "5542b29b3109c21db2fcde67", readOnly_refs: ["55530be4ea96f52a21e3bbe8"], collaberator_refs: []},
			{_id:4, owner_ref: "55530be4ea96f52a21e3bbe8", readOnly_refs: ["5542b29b3109c21db2fcde67"], collaberator_refs: []},
		]

		@db.users.find = sinon.stub().callsArgWith(2, null, @users)
		@db.projects.find = sinon.stub().callsArgWith(2, null, @projects)

		@UserGetter.getUser = (user_id, fields, callback) =>
			callback null, @users[0]

		@emptyGraph = 
			nodes: []
			edges: []

		@nodes = [
			{id:"5542b29b3109c21db2fcde67", label:''}, 
			{id:"55530be4ea96f52a21e3bbe8", label:''},
			{id:"5542b2de3109c21db2fcde6e", label:''}
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

			@AdminGraphController._genSigmaJSGraph = sinon.stub().callsArgWith(3, null, @emptyGraph)

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

		it "should create 1-level graph with three nodes", (done)-> 
			@AdminGraphController._genSigmaJSGraph @projects, @users[0]._id, false, (err, graph) ->
				assert.equal graph.nodes.length, 3
				done()

		it "should create 1-level graph with labeled node", (done)-> 
			@callback = (err, graph)=>
				graph.nodes[0].label.should.equal @users[0].first_name
				done()
			@AdminGraphController._genSigmaJSGraph @projects, @users[0]._id, false, @callback


		it "should create 1-level graph with five edges", (done)-> 
			@AdminGraphController._genSigmaJSGraph @projects, @users[0]._id, false, (err, graph) ->
				assert.equal graph.edges.length, 5
				done()

		it "should create 1-level graph with id in all edges", (done)-> 
			@AdminGraphController._genSigmaJSGraph @projects, @users[0]._id, false, (err, graph) ->
				for edge in graph.edges
					should.exist edge.id
				done()

	describe "_2ndLevel", ->

		beforeEach ->

			@OneLevelGraph = {
				nodes: @nodes,
				edges: [1,2,3,4]
			}

			@SecondLevelGraph = {
				nodes: @nodes,
				edges: [5,6,7,8]
			}

			@AdminGraphController._genSigmaJSGraph = sinon.stub().callsArgWith(3, null, @SecondLevelGraph)
			@AdminGraphController._addSigmaJSNode = sinon.stub().withArgs(4).returns(@nodes)

		it "should create 2-level graph with three nodes", (done)-> 
			@AdminGraphController._2ndLevel @users[0]._id, @OneLevelGraph, (err, graph) ->
				assert.equal graph.nodes.length, 3
				done()

		it "should create 2-level graph with eigth edges", (done)-> 
			@AdminGraphController._2ndLevel @users[0]._id, @OneLevelGraph, (err, graph) ->
				assert.equal graph.edges.length, 8
				done()
