should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
path = require('path')
modulePath = path.join __dirname, '../../../../app/js/TeamImport/TeamImporter'
sinon = require("sinon")
expect = require("chai").expect

describe "TeamImporter", ->
	beforeEach ->
		@v1Team = {
			"id": 5,
			"name": "Test Team",
			"exporting_to_v2_at": "2018-06-22T10:53:30.924Z",
			"v2_id": null,
			"n_licences": 32,
			"owner": {
				"id": 31,
				"name": "Daenerys Targaryen",
				"email": "daenerys@mothersofdragons.com"
			},
			"users": [
				{
					"id": 31,
					"name": "Daenerys Targaryen",
					"email": "daenerys@mothersofdragons.com",
					"plan_name": "pro"
				},
				{
					"id": 32,
					"name": "Test User",
					"email": "test@example.com",
					"plan_name": "pro"
				}
			],
			"pending_invites": [
				{
					"email": "invited@example.com",
					"name": null,
					"code": "secret",
					"plan_name": "pro",
					"created_at": "2018-06-22T10:48:46.650Z",
					"updated_at": "2018-06-22T10:48:46.650Z"
				}
			]
		}

		@teamAdmin = {
			id: 'v2 team admin id'
		}

		@member = {
			id: 'v2 team member id'
		}

		@SubscriptionLocator = {
			getGroupWithV1Id: sinon.stub().yields(null)
			getUsersSubscription: sinon.stub().yields(null)
		}

		@UserGetter = {
			getUser: sinon.stub().yields(null)
		}

		@UserMapper = {
			getSlIdFromOlUser: sinon.stub()
		}

		@UserGetter.getUser.withArgs(sinon.match.has("overleaf.id", 31)).yields(null, @teamAdmin)

		@UserMapper.getSlIdFromOlUser.withArgs(sinon.match.has("id", 31)).yields(null, @teamAdmin)
		@UserMapper.getSlIdFromOlUser.withArgs(sinon.match.has("id", 32)).yields(null, @member)

		@SubscriptionUpdater = {
			addUsersToGroup: sinon.stub().yields(null, true)
			deleteWithV1Id: sinon.stub().yields(null)
		}

		@TeamInvitesHandler = {
			importInvite: sinon.stub().yields(null)
		}

		@Subscription = (data) ->
			data.save = (callback) ->
				data.id = 'v2 id'
				callback(null, data, data)

			data

		@TeamImporter = SandboxedModule.require modulePath, requires:
			"../OverleafUsers/UserMapper": @UserMapper
			"../OverleafUsers/UserMapper": @UserMapper
			"../../../../../app/js/Features/Subscription/TeamInvitesHandler": @TeamInvitesHandler
			"../../../../../app/js/Features/Subscription/SubscriptionLocator": @SubscriptionLocator
			"../../../../../app/js/Features/Subscription/SubscriptionUpdater": @SubscriptionUpdater
			"../../../../../app/js/Features/User/UserGetter": @UserGetter
			"../../../../../app/js/models/Subscription": { Subscription: @Subscription }
			"request": @request = {}
			"logger-sharelatex": { log: sinon.stub(), warn: sinon.stub(), err: sinon.stub() }
			"metrics-sharelatex": { inc: sinon.stub() }
			"settings-sharelatex": @settings =
				overleaf:
					host: "http://overleaf.example.com"
					s3:
						host: "http://s3.example.com"
		@callback = sinon.stub()

	describe "getOrImportTeam", ->
		it "returns an existing team with the same overleaf id", (done) ->
			existingSubscription = { id: 'a2137adfe8912' }
			@SubscriptionLocator.getGroupWithV1Id.yields(null, existingSubscription)

			@TeamImporter.getOrImportTeam @v1Team, (err, v2Team) ->
				expect(err).to.not.exist
				expect(v2Team).to.deep.eq existingSubscription
				done()


		it "creates a new team", (done) ->
			@TeamImporter.getOrImportTeam @v1Team, (err, v2Team) =>
				expect(err).to.not.exist
				expect(v2Team.id).to.eq 'v2 id'

				@UserGetter.getUser.calledWith(
					sinon.match.has("overleaf.id", @v1Team.owner.id)
				).should.equal true
				
				@SubscriptionLocator.getGroupWithV1Id.calledWith(@v1Team.id).should.equal true
				@SubscriptionLocator.getUsersSubscription.calledWith(@teamAdmin.id).should.equal true
				@SubscriptionUpdater.addUsersToGroup.calledWith('v2 id',
					[{ id: 'v2 team admin id'}, {id: 'v2 team member id'}]).should.equal true

				@TeamInvitesHandler.importInvite.calledOnce.should.equal true

				done()

		it "rollbacks the process if there's a failure", (done) ->
			@SubscriptionLocator.getUsersSubscription.yields(new Error("Here be dragons!"))

			@TeamImporter.getOrImportTeam @v1Team, (err, v2Team) =>
				expect(err).to.be.instanceof(Error)
				@SubscriptionUpdater.deleteWithV1Id.calledWith(@v1Team.id).should.equal true
				done()

		it "fails if the team manager already has a team", ->
			managerPreviousTeam = { id: 'a2137adfe8912' }
			@SubscriptionLocator.getUsersSubscription.yields(null, managerPreviousTeam)

			@TeamImporter.getOrImportTeam @v1Team, (err, v2Team) =>
				expect(err).to.be.instanceof(Error)
				@SubscriptionUpdater.deleteWithV1Id.calledWith(@v1Team.id).should.equal true
				done()

		it "fails if the team manager is not already in v2", ->
			managerPreviousTeam = { id: 'a2137adfe8912' }
			@SubscriptionLocator.getUsersSubscription.yields(null, managerPreviousTeam)

			@TeamImporter.getOrImportTeam @v1Team, (err, v2Team) =>
				expect(err).to.be.instanceof(Error)
				@SubscriptionUpdater.deleteWithV1Id.calledWith(@v1Team.id).should.equal true
				done()
