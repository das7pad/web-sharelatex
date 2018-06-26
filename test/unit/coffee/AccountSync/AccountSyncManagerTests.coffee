should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
path = require('path')
modulePath = path.join __dirname, '../../../../app/js/AccountSync/AccountSyncManager'
sinon = require("sinon")
expect = require("chai").expect


describe 'AccountSyncManager', ->

	beforeEach ->
		@AccountSyncManager = SandboxedModule.require modulePath, requires:
			"../../../../../app/js/Features/User/UserGetter": @UserGetter = {}
			"../../../../../app/js/Features/Subscription/FeaturesUpdater":
				@FeaturesUpdater = {}
			'../../../../../app/js/Features/Subscription/SubscriptionLocator':
				@SubscriptionLocator = {}
			"logger-sharelatex":
				log: sinon.stub()
				err: sinon.stub()
				warn: sinon.stub()
			"settings-sharelatex":
				overleaf:
					host: @host = "http://overleaf.example.com"

		@AccountSyncManager._v1PlanRequest = sinon.stub()
		@userId = 'abcd'
		@v1UserId = 42
		@user =
			_id: @userId
			email: 'user@example.com'
			overleaf:
				id: @v1UserId


	describe 'doSync', ->
		beforeEach ->
			@UserGetter.getUser = sinon.stub()
				.callsArgWith(2, null, @user)
			@FeaturesUpdater.refreshFeatures = sinon.stub()
				.yields(null)
			@call = (cb) =>
				@AccountSyncManager.doSync(@v1UserId, cb)

		describe 'when all goes well', ->

			it 'should call getUser', (done) ->
				@call (err) =>
					expect(
						@UserGetter.getUser.callCount
					).to.equal 1
					expect(
						@UserGetter.getUser.calledWith({'overleaf.id': @v1UserId})
					).to.equal true
					done()

			it 'should call refreshFeatures', (done) ->
				@call (err) =>
					expect(
						@FeaturesUpdater.refreshFeatures.callCount
					).to.equal 1
					expect(
						@FeaturesUpdater.refreshFeatures.calledWith(@userId, false)
					).to.equal true
					done()

			it 'should not produce an error', (done) ->
				@call (err) =>
					expect(err).to.not.exist
					done()

		describe 'when getUser produces an error', ->
			beforeEach ->
				@UserGetter.getUser = sinon.stub()
					.callsArgWith(2, new Error('woops'))

			it 'should not call refreshFeatures', (done) ->
				@call (err) =>
					expect(
						@FeaturesUpdater.refreshFeatures.callCount
					).to.equal 0
					done()

			it 'should produce an error', (done) ->
				@call (err) =>
					expect(err).to.exist
					done()

		describe 'when getUser does not find a user', ->
			beforeEach ->
				@UserGetter.getUser = sinon.stub()
					.callsArgWith(2, null, null)

			it 'should not call refreshFeatures', (done) ->
				@call (err) =>
					expect(
						@FeaturesUpdater.refreshFeatures.callCount
					).to.equal 0
					done()

			it 'should not produce an error', (done) ->
				@call (err) =>
					expect(err).to.not.exist
					done()

	describe "_canonicalPlanCode", ->

		it "should default to 'personal'", ->
			expect(
				@AccountSyncManager._canonicalPlanCode(undefined)
			).to.equal 'personal'
			expect(
				@AccountSyncManager._canonicalPlanCode(null)
			).to.equal 'personal'

		it "should map all the used plan codes to a canonical one", ->
			expect(
				@AccountSyncManager._canonicalPlanCode('student')
			).to.equal 'student'
			expect(
				@AccountSyncManager._canonicalPlanCode('student-annual')
			).to.equal 'student'
			expect(
				@AccountSyncManager._canonicalPlanCode('stud-ann_free_trial')
			).to.equal 'student'
			expect(
				@AccountSyncManager._canonicalPlanCode('collaborator')
			).to.equal 'collaborator'
			expect(
				@AccountSyncManager._canonicalPlanCode('collaborator-annual')
			).to.equal 'collaborator'
			expect(
				@AccountSyncManager._canonicalPlanCode('collaborator-annual_free_trial')
			).to.equal 'collaborator'
			expect(
				@AccountSyncManager._canonicalPlanCode('professional')
			).to.equal 'professional'
			expect(
				@AccountSyncManager._canonicalPlanCode('professional-annual')
			).to.equal 'professional'
			expect(
				@AccountSyncManager._canonicalPlanCode('prof-ann_free_trial')
			).to.equal 'professional'
			expect(
				@AccountSyncManager._canonicalPlanCode('group_5_members')
			).to.equal 'professional'
			expect(
				@AccountSyncManager._canonicalPlanCode('personal')
			).to.equal 'personal'
			expect(
				@AccountSyncManager._canonicalPlanCode('unknown')
			).to.equal 'personal'

	describe '_sortPlanCodes', ->
		it 'should sort in descending order of features', ->
			planCodes = ['student', 'personal', 'collaborator', 'professional']
			expect(
				@AccountSyncManager._sortPlanCodes(planCodes)
			).to.deep.equal [
				'professional', 'collaborator', 'student', 'personal'
			]
