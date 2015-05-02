sinon = require('sinon')
chai = require('chai')
should = chai.should()
expect = chai.expect
modulePath = "../../../app/js/AdminController.js"
SandboxedModule = require('sandboxed-module')
events = require "events"
ObjectId = require("mongojs").ObjectId
assert = require("assert")
Path = require "path"

describe "AdminController", ->
	beforeEach ->

		@UserModel =
			find: sinon.stub()
			count: sinon.stub()

		@AdminController = SandboxedModule.require modulePath, requires:
			"logger-sharelatex": 
				log:->
				err:->
			"../../../../app/js/models/User":User:@UserModel

		@users = [{first_name:'James'}, {first_name:'Henry'}]
		@perPage = @AdminController.perPage

		@UserModel.find = (query, fields, opts, callback) =>
			callback null, @users

		@UserModel.count = (query, callback) =>
			callback null, @users.length

		@req = 
			body:
				query: ''

		@res = 
			locals:
				jsPath:"js path here"

	describe "renderAdminPanel", ->

		it "should render the admin page", (done)->
			@res.render = (pageName, opts)=>
				pageName.should.equal  Path.resolve(__dirname + "../../../../")+ "/app/views/admin"
				done()
			@AdminController.renderAdminPanel @req, @res

	describe "listUsers", ->

		it "should render the admin/listUsers page", (done)->
			@res.render = (pageName, opts)=>
				pageName.should.equal  Path.resolve(__dirname + "../../../../")+ "/app/views/listUsers"
				done()
			@AdminController.listUsers @req, @res

		it "should send the users", (done)->
			@res.render = (pageName, opts)=>
				opts.users.should.deep.equal @users
				done()
			@AdminController.listUsers @req, @res

		it "should send the pages", (done)->
			@res.render = (pageName, opts)=>
				opts.pages.should.equal Math.ceil(@users.length / @perPage)
				done()
			@AdminController.listUsers @req, @res

	describe "searchUsers", ->

		beforeEach ->

			@req = 
				body:
					query: ''
					page: 1
					sort: 'field_name'
					reverse: true

		it "should send the users", (done)->
			@res.send = (code, json)=>
				code.should.equal 200
				json.users.should.deep.equal @users
				done()
			@AdminController.searchUsers @req, @res

		it "should send the pages", (done)->
			@res.send = (code, json)=>
				code.should.equal 200
				json.pages.should.equal Math.ceil(@users.length / @perPage)
				done()
			@AdminController.searchUsers @req, @res