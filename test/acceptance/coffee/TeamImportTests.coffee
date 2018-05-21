expect = require("chai").expect
fs = require "fs"
mkdirp = require "mkdirp"
Path = require "path"
Settings = require "settings-sharelatex"
mongoose = require "mongoose"
async = require "async"

WEB_PATH = '../../../../..'

{db, ObjectId} = require "#{WEB_PATH}/app/js/infrastructure/mongojs"
MockOverleafApi = require "./helpers/MockOverleafApi"
User = require "#{WEB_PATH}/test/acceptance/js/helpers/User"
Subscription = require("#{WEB_PATH}/app/js/models/Subscription").Subscription
UserStub = require("#{WEB_PATH}/app/js/models/UserStub").UserStub


describe "Team imports", ->

	before ->
		# Make mongoose use native promises, otherwise it prints a warning
		mongoose.Promise = global.Promise

	beforeEach (done) ->
		@teamAdmin = new User()
		@admin = new User(isAdmin: true)
		@admin.login =>
			@admin.ensure_admin done

	afterEach ->
		MockOverleafApi.reset()
		Subscription.remove("overleaf.id": { $exists: true })

	describe "With an already imported team", ->
		beforeEach (done) ->
			Subscription.create {
				overleaf: {
					id: 4
				},
				admin_id: @teamAdmin._id
			}, (err, subscription) =>
				@subscription = subscription
				done()

			null # don't return a promise


		it "returns the existing v2 team", (done) ->
			@admin.request.post "/overleaf/import_team/4", (error, response, body) =>
				return done(error) if error?

				team = JSON.parse(body)

				expect(team.overleaf.id).to.eq(4)
				expect(team._id).to.eq(@subscription._id.toString())

				done()

	describe "import a new team", ->
		it "imports a team from v1", (done) ->
			@admin.request.post "/overleaf/import_team/5", (error, response, body) =>
				return done(error) if error?

				Subscription.findOne("overleaf.id": 5).exec (error, subscription) ->
					return done(error) if error?
					expect(subscription.overleaf.id).to.eq(5)
					expect(subscription.member_ids.length).to.eq(2)

					getUser = (id, cb) -> UserStub.findOne(_id: id, cb)

					async.map subscription.member_ids, getUser, (error, members) ->
						imported = members.map (m) -> { id: m.overleaf.id, email: m.email }

						# these come from the default data in the mock api
						expect(imported).to.include(id: 1, email: "user1@example.com")
						expect(imported).to.include(id: 2, email: "user2@example.com")

						done()


		it "rolls back the change if there's a failure", (done) ->
			# Team id 8 is set to fail in the mocked api
			@admin.request.post "/overleaf/import_team/8", (error, response, body) =>
				Subscription.findOne("overleaf.id": 8).exec (error, subscription) ->
						return done(error) if error?
						expect(response.statusCode).to.eq(500)
						expect(subscription).to.eq(null)
						done()
