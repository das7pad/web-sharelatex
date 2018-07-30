expect = require("chai").expect
fs = require "fs"
mkdirp = require "mkdirp"
Path = require "path"
Settings = require "settings-sharelatex"
mongoose = require "mongoose"
async = require "async"

WEB_PATH = '../../../../..'

request = require "#{WEB_PATH}/test/acceptance/js/helpers/request"
MockOverleafApi = require "./helpers/MockOverleafApi"

{db, ObjectId} = require "#{WEB_PATH}/app/js/infrastructure/mongojs"
User = require "#{WEB_PATH}/test/acceptance/js/helpers/User"
Subscription = require("#{WEB_PATH}/app/js/models/Subscription").Subscription
UserGetter = require("#{WEB_PATH}/app/js/Features/User/UserGetter")
UserMapper = require("../../../app/js/OverleafUsers/UserMapper")

describe "Team imports", ->

	before ->
		# Make mongoose use native promises, otherwise it prints a warning
		mongoose.Promise = global.Promise

	beforeEach (done) ->
		@v1Team = {
			"id": 5,
			"name": "Test Team",
			"exporting_to_v2_at": "2018-06-22T10:53:30.924Z",
			"v2_id": null,
			"n_licences": 32,
			"owner": {
				"id": 1,
				"name": "Daenerys Targaryen",
				"email": "daenerys@mothersofdragons.com"
			},
			"users": [
				{
					"id": 1,
					"name": "Daenerys Targaryen",
					"email": "daenerys@mothersofdragons.com",
					"plan_name": "pro"
				},
				{
					"id": 2,
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

		UserMapper.createSlUser @v1Team.owner, (error, sl_user) =>
			@teamAdmin = sl_user
			done()

		null # Don't return a promise

	afterEach ->
		Subscription.remove("overleaf.id": { $exists: true })

	describe "With an already imported team", ->
		beforeEach (done) ->
			Subscription.create {
				overleaf: {
					id: 5
				},
				admin_id: @teamAdmin._id
			}, (err, subscription) =>
				@subscription = subscription
				done()

			null # don't return a promise


		it "returns the existing v2 team", (done) ->
			importTeam @v1Team, (error, response, team) =>
				return done(error) if error?

				expect(team.overleaf.id).to.eq(5)
				expect(team.id).to.eq(@subscription.id)

				done()

	describe "import a new team", ->
		it "imports a team from v1", (done) ->
			importTeam @v1Team, (error, response, body) =>
				return done(error) if error?

				Subscription.findOne("overleaf.id": 5).exec (error, subscription) ->
					return done(error) if error?
					expect(subscription.overleaf.id).to.eq(5)
					expect(subscription.membersLimit).to.eq(32)
					expect(subscription.admin_id).to.be.an.instanceof(ObjectId)
					expect(subscription.member_ids.length).to.eq(2)

					expect(subscription.teamInvites.length).to.eq(1)

					teamInvite = subscription.teamInvites[0]

					expect(teamInvite.email).to.eq "invited@example.com"
					expect(teamInvite.token).to.eq "secret"
					expect(teamInvite.inviterName).to.eq "Test Team"
					expect(teamInvite.sentAt).to.be.an.instanceof(Date)

					getUser = (id, cb) -> UserGetter.getUserOrUserStubById(id,
						{ 'overleaf.id': 1, email: 1}, cb)

					async.map subscription.member_ids, getUser, (error, members) ->
						imported = members.map (m) -> { id: m.overleaf.id, email: m.email }

						expect(imported).to.include(id: 1, email: "daenerys@mothersofdragons.com")
						expect(imported).to.include(id: 2, email: "test@example.com")

						done()


		it "rolls back the change if there's a failure", (done) ->
			@v1Team.n_licences = 0 # This will make the import to fail

			importTeam @v1Team, (error, response, body) =>
				Subscription.findOne("overleaf.id": 5).exec (error, subscription) ->
					return done(error) if error?
					expect(response.statusCode).to.eq(500)
					expect(subscription).to.eq(null)
					done()

importTeam = (team, callback) ->
	request {
		method: 'POST',
		url: "/overleaf/import_team/"
		json: true,
		body: { team: team }
		auth:
			user: 'sharelatex'
			pass: 'password'
			sendImmediately: true
	}, callback
