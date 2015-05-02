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

		@res = 
			locals:
				jsPath:"js path here"

		@AdminController = SandboxedModule.require modulePath, requires:
			"logger-sharelatex": 
				log:->
				err:->
			"../../../../app/js/models/User":User:@UserModel

	describe "listUsers", ->

		beforeEach ->

			@users = [{first_name:'James'}, {first_name:'Henry'}]
			@perPage = @AdminController.perPage

			@UserModel.find = (query, fields, opts, callback) =>
				callback null, @users

			@UserModel.count = (query, callback) =>
				callback null, @users.length

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