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

		@user = {user_id:1,first_name:'James'}
		@users = [
			{_id:"5542b29b3109c21db2fcde67",first_name:'James'}, 
			{_id:"55530be4ea96f52a21e3bbe8", first_name:'Henry'}
		]
		@projects = [
			{_id:1, owner_ref: "5542b29b3109c21db2fcde67", readOnly_refs: [], collaberator_refs: []}, 
			{_id:2, owner_ref: "55530be4ea96f52a21e3bbe8", readOnly_refs: [], collaberator_refs: []}
		]

		@db.users.find = sinon.stub().callsArgWith(2, null, @users)
		@db.projects.find = sinon.stub().callsArgWith(2, null, @projects)

		@UserGetter.getUser = (user_id, fields, callback) =>
			callback null, @user

		@nodes = []

		@emptyGraph = 
			nodes: []
			edges: []

		@req = 
			params:
				user_id: 'user_id_here'

		@res = 
			locals:
				jsPath:"js path here"

		@callback = sinon.stub()

	describe "userGraph", ->

		beforeEach ->

			@AdminGraphController._genGraph = sinon.stub().callsArgWith(3, null, @emptyGraph)

		it "should render the graph page", (done)->
			@res.render = (pageName, opts)=>
				pageName.should.equal  Path.resolve(__dirname + "../../../../")+ "/app/views/userGraph"
				done()
			@AdminGraphController.userGraph @req, @res

		it "should send the user", (done)->
			@res.render = (pageName, opts)=>
				opts.user.should.deep.equal @user
				done()
			@AdminGraphController.userGraph @req, @res

		it "should send the user graph", (done)->
			@res.render = (pageName, opts)=>
				opts.graph.should.deep.equal @emptyGraph
				done()
			@AdminGraphController.userGraph @req, @res

	describe "_addNode", ->

		it "should add a new node", (done)-> 
			nodes = @AdminGraphController._addNode [], 'ref', 'label', 'color'
			assert.equal nodes.length, 1
			done()

		it "shouldn't add a existing node", (done)-> 
			nodes = @AdminGraphController._addNode [{id:'ref'}], 'ref', 'label', 'color'
			assert.equal nodes.length, 1
			done()
