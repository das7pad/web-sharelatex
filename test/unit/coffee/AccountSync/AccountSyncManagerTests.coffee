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
			"../../../../../app/js/Features/Subscription/SubscriptionUpdater":
				@SubscriptionUpdater = {}
			"logger-sharelatex": { log: sinon.stub(), err: sinon.stub() }
			"settings-sharelatex":
				overleaf:
					host: @host = "http://overleaf.example.com"
			"../OAuth/OAuthRequest": @oAuthRequest = {}
		@AccountSyncManager._overleafPlanRequest = sinon.stub()
		@userId = 'abcd'
		@overleafUserId = 42
		@user =
			_id: @userId
			email: 'user@example.com'
			overleaf:
				id: @overleafUserId


	describe 'doSync', ->
		beforeEach ->
			@UserGetter.getUser = sinon.stub()
				.callsArgWith(2, null, @user)
			@SubscriptionUpdater.refreshSubscription = sinon.stub()
				.callsArgWith(1, null)
			@call = (cb) =>
				@AccountSyncManager.doSync(@overleafUserId, cb)

		describe 'when all goes well', ->

			it 'should call getUser', (done) ->
				@call (err) =>
					expect(
						@UserGetter.getUser.callCount
					).to.equal 1
					expect(
						@UserGetter.getUser.calledWith({'overleaf.id': @overleafUserId})
					).to.equal true
					done()

			it 'should call refreshSubscription', (done) ->
				@call (err) =>
					expect(
						@SubscriptionUpdater.refreshSubscription.callCount
					).to.equal 1
					expect(
						@SubscriptionUpdater.refreshSubscription.calledWith(@userId)
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

			it 'should not call refreshSubscription', (done) ->
				@call (err) =>
					expect(
						@SubscriptionUpdater.refreshSubscription.callCount
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

			it 'should not call refreshSubscription', (done) ->
				@call (err) =>
					expect(
						@SubscriptionUpdater.refreshSubscription.callCount
					).to.equal 0
					done()

			it 'should produce an error', (done) ->
				@call (err) =>
					expect(err).to.exist
					done()


	describe 'getPlanCodeFromOverleaf', ->
		beforeEach ->
			@responseBody =
				id: 32,
				plan_name: 'pro'
			@UserGetter.getUser = sinon.stub()
				.callsArgWith(2, null, @user)
			@AccountSyncManager._overleafPlanRequest = sinon.stub()
				.callsArgWith(2, null, @responseBody)
			@call = (cb) =>
				@AccountSyncManager.getPlanCodeFromOverleaf @userId, cb

		describe 'when all goes well', ->

			it 'should call getUser', (done) ->
				@call (err, planCode) =>
					expect(
						@UserGetter.getUser.callCount
					).to.equal 1
					expect(
						@UserGetter.getUser.calledWith(@userId)
					).to.equal true
					done()

			it 'should call _overleafPlanRequest', (done) ->
				@call (err, planCode) =>
					expect(
						@AccountSyncManager._overleafPlanRequest.callCount
					).to.equal 1
					expect(
						@AccountSyncManager._overleafPlanRequest.calledWith(
							@userId,
							@overleafUserId
						)
					).to.equal true
					done()

			it 'should produce a plan-code without error', (done) ->
				@call (err, planCode) =>
					expect(err).to.not.exist
					expect(planCode).to.equal 'v1_pro'
					done()

			describe 'when the plan_name from overleaf is null', ->
				beforeEach ->
					@responseBody.plan_name = null

				it 'should produce a null plan-code without error', (done) ->
					@call (err, planCode) =>
						expect(err).to.not.exist
						expect(planCode).to.equal null
						done()

		describe 'when getUser produces an error', ->
			beforeEach ->
				@UserGetter.getUser = sinon.stub()
					.callsArgWith(2, new Error('woops'))

			it 'should not call _overleafPlanRequest', (done) ->
				@call (err, planCode) =>
					expect(
						@AccountSyncManager._overleafPlanRequest.callCount
					).to.equal 0
					done()

			it 'should produce an error', (done) ->
				@call (err, planCode) =>
					expect(err).to.exist
					expect(planCode).to.not.exist
					done()

		describe 'when getUser does not find a user', ->
			beforeEach ->
				@UserGetter.getUser = sinon.stub()
					.callsArgWith(2, null, null)

			it 'should not call _overleafPlanRequest', (done) ->
				@call (err, planCode) =>
					expect(
						@AccountSyncManager._overleafPlanRequest.callCount
					).to.equal 0
					done()

			it 'should produce a null plan-code, without error', (done) ->
				@call (err, planCode) =>
					expect(err).to.not.exist
					expect(planCode).to.not.exist
					done()

		describe 'when the request to overleaf fails', ->
			beforeEach ->
				@AccountSyncManager._overleafPlanRequest = sinon.stub()
					.callsArgWith(2, new Error('woops'))

			it 'should produce an error', (done) ->
				@call (err, planCode) =>
					expect(err).to.exist
					expect(planCode).to.not.exist
					done()
