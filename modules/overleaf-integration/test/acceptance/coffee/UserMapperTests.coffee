expect = require("chai").expect
fs = require "fs"
mkdirp = require "mkdirp"
Path = require "path"
Settings = require "settings-sharelatex"
mongoose = require "mongoose"
async = require "async"
_ = require 'underscore'

WEB_PATH = '../../../../..'

{db, ObjectId} = require "#{WEB_PATH}/app/js/infrastructure/mongojs"
MockOverleafApi = require "./helpers/MockOverleafApi"
User = require "#{WEB_PATH}/test/acceptance/js/helpers/User"
UserMapper = require "../../../app/js/OverleafUsers/UserMapper"
Subscription = require("#{WEB_PATH}/app/js/models/Subscription").Subscription
UserStub = require("#{WEB_PATH}/app/js/models/UserStub").UserStub
ProjectCreationHandler = require("#{WEB_PATH}/app/js/Features/Project/ProjectCreationHandler")
Project = require("#{WEB_PATH}/app/js/models/Project").Project

logger = require "logger-sharelatex"
logger.logger.level('fatal')

olId = 9345
nextOlId = () ->
	olId++
	return olId

describe "UserMapper", ->
	before ->
		# Make mongoose use native promises, otherwise it prints a warning
		mongoose.Promise = global.Promise

	describe "createSlUser", ->
		before (done) ->
			@email = 'acceptance-test-ol-user@example.com'
			async.series [
				(cb) =>
					UserStub.create(
						overleaf: { id: @olId = nextOlId() },
						(error, @userStub) => cb()
					)
				(cb) =>
					UserMapper.createSlUser {
						id: @olId,
						email: @email
					}, cb
			], done

		it "should set the overleaf id", (done) ->
			db.users.findOne { 'overleaf.id': @olId }, (error, user) =>
				expect(user).to.exist
				done()

		it "should delete the user stub", (done) ->
			db.userStubs.findOne { _id: ObjectId(@userStub._id) }, (error, userStub) =>
				expect(userStub).to.not.exist
				done()

	describe "mergeWithSlUser", ->
		beforeEach (done) ->
			async.series [
				(cb) =>
					@slUser = new User()
					@slUser.ensureUserExists cb
				(cb) =>
					UserStub.create(
						overleaf: { id: @olId = nextOlId() },
						(error, @userStub) => cb()
					)
			], done

		describe "setting up the SL user", ->
			beforeEach (done) ->
				UserMapper.mergeWithSlUser @slUser._id, {
					id: @olId,
					email: @slUser.email
				}, done
				return

			it "should set the overleaf id", (done) ->
				db.users.findOne { _id: ObjectId(@slUser._id) }, (error, user) =>
					expect(user.overleaf.id).to.eq @olId
					done()

			it "should delete the user stub", (done) ->
				db.userStubs.findOne { _id: ObjectId(@userStub._id) }, (error, userStub) =>
					expect(userStub).to.not.exist
					done()

		describe "with a subscription mapped to the user stub", ->
			beforeEach (done) ->
				async.series [
					(cb) =>
						Subscription.create({
							admin_id: @userStub._id,
							member_ids: [@userStub._id]
						}, (error, @subscription) => cb())
					(cb) =>
						UserMapper.mergeWithSlUser @slUser._id, {
							id: @olId,
							email: @slUser.email
						}, cb
				], done

			it "should replace user stub references in subscription admin_ids", (done) ->
				Subscription.findOne _id: @subscription._id, (error, subscription) =>
					expect(
						subscription.admin_id.toString()
					).to.equal(
						@slUser._id.toString()
					)
					done()
				return

			it "updates member_ids references to UserStubs", (done) ->
				Subscription.findOne _id: @subscription._id, (error, subscription) =>
					expect(subscription.member_ids.length).to.eq(1)
					expect(
						subscription.member_ids[0].toString()
					).to.equal(
						@slUser._id.toString()
					)
					done()
				return

		describe "with a project owner mapped to the user stub", ->
			beforeEach (done) ->
				async.series [
					(cb) =>
						ProjectCreationHandler._createBlankProject @userStub._id, 'test-project', {}, (error, @project) =>
							cb(error)
					(cb) =>
						UserMapper.mergeWithSlUser @slUser._id, {
							id: @olId,
							email: @slUser.email
						}, cb
				], done

			it "should replace user stub references in project owner_ref", (done) ->
				Project.findOne _id: @project._id, (error, project) =>
					expect(
						project.owner_ref.toString()
					).to.equal(
						@slUser._id.toString()
					)
					done()
				return

		describe "with affiliations", ->
			beforeEach (done) ->
				async.series [
					(cb) =>
						UserMapper.mergeWithSlUser @slUser._id, {
							id: @olId,
							email: @slUser.email
							affiliations: [{
								email: @slUser.email,
								university: 42,
								role: 'Student',
								department: 'Banana Studies',
								confirmed_at: @main_email_confirmed_at_ts = Date.now()
							}, {
								email: 'confirmed-affiliation@example.com',
								university: 43,
								role: 'Professor',
								department: 'Peach Studies',
								confirmed_at: @confirmed_email_confirmed_at_ts = Date.now() - 1000
							}, {
								email: 'not-confirmed-affiliation@example.com',
								university: 44,
								confirmed_at: null
							}]
						}, cb
				], done

			afterEach (done) ->
				db.users.remove { _id: ObjectId(@slUser._id) }, done

			it "should import all emails and confirmation status", (done) ->
				db.users.findOne { _id: ObjectId(@slUser._id) }, (error, user) =>
					emails = user.emails.map(
						({email, confirmedAt}) -> {email, confirmedAt}
					)
					# The order isn't always deterministic
					emails = _.sortBy(emails, ({email}) -> email)
					expect(emails).to.deep.equal [{
						email: @slUser.email, # Will start with acceptance-test...@example.com
						confirmedAt: new Date(@main_email_confirmed_at_ts)
					}, {
						email: 'confirmed-affiliation@example.com',
						confirmedAt: new Date(@confirmed_email_confirmed_at_ts)
					}, {
						email: 'not-confirmed-affiliation@example.com',
						confirmedAt: undefined
					}]
					done()

			it "should add affiliation data for the emails", ->
				expect(
					MockOverleafApi.addAffiliation.calledWith(
						@slUser._id,
						{
							email: @slUser.email,
							university: 42,
							role: 'Student',
							department: 'Banana Studies'
						}
					)
				).to.equal true
				expect(
					MockOverleafApi.addAffiliation.calledWith(
						@slUser._id,
						{
							email: 'confirmed-affiliation@example.com',
							university: 43,
							role: 'Professor',
							department: 'Peach Studies'
						}
					)
				).to.equal true
				expect(
					MockOverleafApi.addAffiliation.calledWith(
						@slUser._id,
						{
							email: 'not-confirmed-affiliation@example.com',
							university: 44
						}
					)
				).to.equal true

		describe "with an affiliation email that already exists on this user", ->
			beforeEach (done) ->
				async.series [
					(cb) =>
						db.users.update {
							_id: ObjectId(@slUser._id)
						}, {
							$push: {
								emails: {
									email: 'existing-affiliation@example.com'
									createdAt: new Date()
								}
							}
						}, cb
					(cb) =>
						UserMapper.mergeWithSlUser @slUser._id, {
							id: @olId,
							email: @slUser.email
							affiliations: [{
								email: 'existing-affiliation@example.com',
								university: 43,
								role: 'Student',
								department: 'Banana Studies'
								confirmed_at: Date.now()
							}]
						}, cb
				], done

			afterEach (done) ->
				db.users.remove { _id: ObjectId(@slUser._id) }, done

			it "should add the affiliation data for the email", ->
				expect(
					MockOverleafApi.addAffiliation.calledWith(
						@slUser._id,
						{
							email: 'existing-affiliation@example.com',
							university: 43,
							role: 'Student',
							department: 'Banana Studies'
						}
					)
				).to.equal true

		describe "with an affiliation email that already exists on another user", ->
			beforeEach (done) ->
				async.series [
					(cb) =>
						otherUser = new User()
						otherUser.email = 'duplicate-affiliation@example.com'
						otherUser.ensureUserExists cb
					(cb) =>
						UserMapper.mergeWithSlUser @slUser._id, {
							id: @olId,
							email: @slUser.email
							affiliations: [{
								email: 'duplicate-affiliation@example.com',
								university: 43,
								role: 'Student',
								department: 'Banana Studies'
								confirmed_at: Date.now()
							}]
						}, cb
				], done

			afterEach (done) ->
				db.users.remove { _id: ObjectId(@slUser._id) }, done

			it "should drop the email from the user", (done) ->
				db.users.findOne { _id: ObjectId(@slUser._id) }, (error, user) =>
					expect(user.emails.length).to.equal 1
					expect(user.emails[0].email).to.equal @slUser.email
					done()
