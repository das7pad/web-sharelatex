sinon = require('sinon')
chai = require('chai')
should = chai.should()
expect = chai.expect
modulePath = "../../../app/js/UserAdminController.js"
SandboxedModule = require('sandboxed-module')
events = require "events"
ObjectId = require("mongojs").ObjectId
assert = require("assert")
Path = require "path"

describe "UserAdminController", ->
	beforeEach ->
		@user = {user_id:1,first_name:'James'}
		@users = users = [{first_name:'James'}, {first_name:'Henry'}]
		@projects = [{lastUpdated:1, _id:1, owner_ref: "user-1"}, {lastUpdated:2, _id:2, owner_ref: "user-2"}]
		@perPage = @UserAdminController.perPage

		@UserGetter =
			getUser: sinon.stub()

		@UserDeleter =
			deleteUser: sinon.stub().callsArgWith(1)
	
		@UserUpdater =
			changeEmailAddress: sinon.stub()
		
		@User = class User
			@update: sinon.stub().yields()
			@find: sinon.stub().yields(null, users)

		@AuthenticationManager =
			setUserPassword: sinon.stub()
	
		@SubscriptionLocator =
			getUsersSubscription: sinon.stub().yields(null, @user_subscription = {"mock": "subscription"})
			getMemberSubscriptions: sinon.stub().yields(null, @member_subscriptions = [{"mock": "subscriptions"}])
		
		@ProjectGetter =
			findAllUsersProjects: sinon.stub().yields(null, @projects)

		@UserAdminController = SandboxedModule.require modulePath, requires:
			"logger-sharelatex":
				log:->
				err:->
			"../../../../app/js/Features/User/UserGetter":@UserGetter
			"../../../../app/js/Features/User/UserDeleter":@UserDeleter
			"../../../../app/js/Features/User/UserUpdater":@UserUpdater
			"../../../../app/js/Features/Authentication/AuthenticationManager":@AuthenticationManager
			"../../../../app/js/Features/Subscription/SubscriptionLocator": @SubscriptionLocator
			"../../../../app/js/models/User": User: @User
			"../../../../app/js/Features/Project/ProjectGetter": @ProjectGetter
			"metrics-sharelatex":
				gauge:->

		@UserGetter.getUser = (user_id, fields, callback) =>
			callback null, @user

		@req =
			body:
				query: ''

		@res =
			locals:
				jsPath:"js path here"
			send: sinon.stub()
			sendStatus: sinon.stub()

	describe "index", ->

		it "should render the admin/index page", (done)->
			@res.render = (pageName, opts)=>
				pageName.should.equal  Path.resolve(__dirname + "/../../../")+ "/app/views/user/index"
				done()
			@UserAdminController.index @req, @res

		it "should send the users", (done)->
			@res.render = (pageName, opts)=>
				opts.users.should.deep.equal @users
				done()
			@UserAdminController.index @req, @res

		it "should send the pages", (done)->
			@res.render = (pageName, opts)=>
				opts.pages.should.equal Math.ceil(@users.length / @perPage)
				done()
			@UserAdminController.index @req, @res

	describe "search", ->

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
			@UserAdminController.search @req, @res

		it "should send the pages", (done)->
			@res.send = (code, json)=>
				code.should.equal 200
				json.pages.should.equal Math.ceil(@users.length / @perPage)
				done()
			@UserAdminController.search @req, @res

	describe "show", ->

		beforeEach ->

			@req =
				params:
					user_id: 'user_id_here'

		it "should render the admin/userInfo page", (done)->
			@res.render = (pageName, opts)=>
				pageName.should.equal  Path.resolve(__dirname + "/../../../")+ "/app/views/user/show"
				done()
			@UserAdminController.show @req, @res

		it "should send the user", (done)->
			@res.render = (pageName, opts)=>
				opts.user.should.deep.equal @user
				done()
			@UserAdminController.show @req, @res

		it "should send the user projects", (done)->
			@res.render = (pageName, opts)=>
				opts.projects.should.deep.equal @projects
				done()
			@UserAdminController.show @req, @res
		
		it "should send the user's subscription", (done) ->
			@res.render = (pageName, opts)=>
				opts.subscription.should.deep.equal @user_subscription
				done()
			@UserAdminController.show @req, @res
		
		it "should send the user's subscription", (done) ->
			@res.render = (pageName, opts)=>
				opts.memberSubscriptions.should.deep.equal @member_subscriptions
				done()
			@UserAdminController.show @req, @res

	describe "delete", ->

		it "should delete the user", (done)->
			@req =
				params:
					user_id: 'user_id_here'
			@res.sendStatus = (code)=>
				@UserDeleter.deleteUser.calledWith('user_id_here').should.equal true
				code.should.equal 200
				done()
			@UserAdminController.delete @req, @res

	describe "update", ->
		beforeEach ->
			@req.params =
				user_id: @user_id = ObjectId().toString()
			@res.sendStatus = sinon.stub()

		describe "successfully", ->
			beforeEach ->
				@req.body =
					first_name: "James"
				@UserAdminController.update @req, @res

			it "should call User.update with the updated attributes", ->
				@User.update
					.calledWith({_id: @user_id})
					.should.equal true
				updateQuery = @User.update.args[0][1]
				updateQuery.$set.first_name.should.equal "James"
			
		describe "with unknown attribute", ->
			beforeEach ->
				@req.body =
					foo_bar: 100
				@UserAdminController.update @req, @res

			it "should ignore the attribute", ->
				@User.update
					.calledWith({_id: @user_id})
					.should.equal true
				updateQuery = @User.update.args[0][1]
				expect(updateQuery.$set.foo_bar).to.equal undefined
		
		describe "with boolean attribute set to 'on'", ->
			beforeEach ->
				@req.body =
					'features.versioning': 'on'
				@UserAdminController.update @req, @res

			it "should set the attribute to true", ->
				updateQuery = @User.update.args[0][1]
				expect(updateQuery.$set['features.versioning']).to.equal true
			
		describe "with missing boolean attribute", ->
			beforeEach ->
				@req.body = {}
				@UserAdminController.update @req, @res

			it "should set the attribute to false", ->
				updateQuery = @User.update.args[0][1]
				expect(updateQuery.$set['features.versioning']).to.equal false
				
	describe "updateEmail", ->
		beforeEach ->
			@req.params =
				user_id: @user_id = ObjectId().toString()
			@req.body =
				email: @email = "jane@example.com"
			
		describe "successfully", ->
			beforeEach ->
				@UserUpdater.changeEmailAddress.yields(null)
				@UserAdminController.updateEmail @req, @res
			
			it "should update the email", ->
				@UserUpdater.changeEmailAddress
					.calledWith(@user_id, @email)
					.should.equal true
			
			it "should return 204", ->
				@res.sendStatus.calledWith(204).should.equal true
			
		describe "with existing email", ->
			beforeEach ->
				@UserUpdater.changeEmailAddress.yields({message: "alread_exists"})
				@UserAdminController.updateEmail @req, @res
			
			it "should return 400 with a message", ->
				@res.send.calledWith(400, {message: "Email is in use by another user"}).should.equal true
			