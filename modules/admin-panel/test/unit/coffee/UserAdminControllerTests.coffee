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
		@projects = {owned:[{lastUpdated:1, _id:1, owner_ref: "user-1"}, {lastUpdated:2, _id:2, owner_ref: "user-2"}], readAndWrite:[], readOnly:[]}
		@user_count = user_count = 35043

		@UserGetter =
			getUser: sinon.stub()

		@UserDeleter =
			deleteUser: sinon.stub().callsArgWith(1)
	
		@UserUpdater =
			changeEmailAddress: sinon.stub()
		
		@User = class User
			@update: sinon.stub().yields()
			@find: sinon.stub().yields(null, users)
			@count: sinon.stub().yields(null, user_count)

		@AuthenticationManager =
			setUserPassword: sinon.stub()

		@AuthenticationController = {}
	
		@adminSubscription = _id: 'mock-subscription-id-1'
		@memberSubscriptions = [
			( _id: 'mock-subscription-id-2')
			( _id: 'mock-subscription-id-3')
		]
		@managedSubscription = _id: 'mock-subscription-id-4'
		@SubscriptionLocator =
			getUsersSubscription: sinon.stub().yields(null, @adminSubscription)
			getMemberSubscriptions: sinon.stub().yields(null, @memberSubscriptions)
			findManagedSubscription: sinon.stub().yields(null, @managedSubscription)
		
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
			"../../../../app/js/Features/Authentication/AuthenticationController":@AuthenticationController
			"../../../../app/js/Features/Subscription/SubscriptionLocator": @SubscriptionLocator
			"../../../../app/js/models/User": User: @User
			"../../../../app/js/Features/Project/ProjectGetter": @ProjectGetter
			"metrics-sharelatex":
				gauge:->
			"settings-sharelatex": @settings = {}

		@perPage = @UserAdminController.PER_PAGE

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
				opts.pages.should.equal Math.ceil(@user_count / @perPage)
				done()
			@UserAdminController.index @req, @res

	describe "search", ->

		beforeEach ->

			@req =
				body:
					query: ''
					page: 1

		it "should send the users", (done)->
			@res.send = (code, json)=>
				code.should.equal 200
				json.users.should.deep.equal @users
				done()
			@UserAdminController.search @req, @res

		it "should send the pages", (done)->
			@res.send = (code, json)=>
				code.should.equal 200
				json.pages.should.equal Math.ceil(@user_count / @perPage)
				done()
			@UserAdminController.search @req, @res

	describe "show", ->

		beforeEach ->
			@UserAdminController._isSuperAdmin = sinon.stub().withArgs(@req).returns(false)
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
				opts.projects.should.deep.equal @projects.owned
				done()
			@UserAdminController.show @req, @res
		
		it "should send the user's subscription", (done) ->
			@res.render = (pageName, opts)=>
				opts.adminSubscription.should.deep.equal @adminSubscription
				done()
			@UserAdminController.show @req, @res
		
		it "should send the user's member subscriptions", (done) ->
			@res.render = (pageName, opts)=>
				opts.memberSubscriptions.should.deep.equal @memberSubscriptions
				done()
			@UserAdminController.show @req, @res

		it "should send the user's managed subscription", (done) ->
			@res.render = (pageName, opts)=>
				opts.managedSubscription.should.deep.equal @managedSubscription
				done()
			@UserAdminController.show @req, @res

		it "should set the super admin state", (done) ->
			@res.render = (pageName, opts)=>
				expect(opts.isSuperAdmin).to.equal false
				done()
			@UserAdminController.show @req, @res

		it "should set the super admin state to true when super admin", (done) ->
			@UserAdminController._isSuperAdmin = sinon.stub().withArgs(@req).returns(true)
			@res.render = (pageName, opts)=>
				expect(opts.isSuperAdmin).to.equal true
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
			@UserAdminController._isSuperAdmin = sinon.stub().withArgs(@req).returns(false)
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

		describe "with super admin only attribute", ->
			beforeEach ->
				@req.body =
					isAdmin: true
				@UserAdminController.update @req, @res

			it "should ignore the attribute", ->
				updateQuery = @User.update.args[0][1]
				expect(updateQuery.$set.isAdmin).to.equal undefined

		describe "with super admin only attribute when a super admin", ->
			beforeEach ->
				@UserAdminController._isSuperAdmin = sinon.stub().withArgs(@req).returns(true)
				@req.body =
					isAdmin: true
				@UserAdminController.update @req, @res

			it "should ignore the attribute", ->
				updateQuery = @User.update.args[0][1]
				expect(updateQuery.$set.isAdmin).to.equal true

				
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
			
	describe "_isSuperAdmin", ->
		beforeEach ->
			@current_user_id = 'current_user_id-123'
			@AuthenticationController.getLoggedInUserId = sinon.stub().withArgs(@req).returns(@current_user_id)

		it "should return false if no super admin setting is set", ->
			delete @settings.superAdminUserIds
			expect(
				@UserAdminController._isSuperAdmin(@req)
			).to.equal false

		it "should return false if user is not in super admins", ->
			@settings.superAdminUserIds = ['not-current-user']
			expect(
				@UserAdminController._isSuperAdmin(@req)
			).to.equal false

		it "should return true if user is in super admins", ->
			@settings.superAdminUserIds = [@current_user_id]
			expect(
				@UserAdminController._isSuperAdmin(@req)
			).to.equal true
