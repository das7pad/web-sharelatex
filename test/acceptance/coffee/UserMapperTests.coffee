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
UserMapper = require "../../../app/js/OverleafUsers/UserMapper"
Subscription = require("#{WEB_PATH}/app/js/models/Subscription").Subscription
UserStub = require("#{WEB_PATH}/app/js/models/UserStub").UserStub


describe "UserMapper", ->
	describe "Subscription updates", ->
		before ->
			# Make mongoose use native promises, otherwise it prints a warning
			mongoose.Promise = global.Promise

		beforeEach ->
			UserStub.create(overleaf: { id: 9 }).then (admin) =>
				UserStub.create(overleaf: { id: 10 }).then (member) =>
					Subscription.create({
						admin_id: admin._id,
						member_ids: [member.id],
						overleaf: { id: 1 }
					}).then (subscription) =>
						@subscriptionId = subscription.id

		afterEach ->
			UserStub.remove("overleaf.id": { $exists: true }).then ->
				Subscription.remove("overleaf.id": { $exists: true })

		it "updates the admin_id references to UserStubs", ->
			UserMapper.createSlUser({id: 9, email: "alice@example.com"}, "accessToken", "refreshToken").then (slUser) =>
				expect(slUser.overleaf.id).to.eq 9
				Subscription.findOne(_id: @subscriptionId).then (subscription) =>
					expect(subscription.admin_id.toString()).to.equals(slUser._id.toString())

		it "updates member_ids references to UserStubs", ->
			UserMapper.createSlUser({id: 10, email: "alice@example.com"}, "accessToken", "refreshToken").then (slUser) =>
				expect(slUser.overleaf.id).to.eq 10
				Subscription.findOne(_id: @subscriptionId).then (subscription) =>
					expect(subscription.member_ids.length).to.eq(1)
					expect(subscription.member_ids[0].toString()).to.equals(slUser._id.toString())
