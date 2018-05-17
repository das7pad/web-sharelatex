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
			"logger-sharelatex":
				log: sinon.stub()
				err: sinon.stub()
				warn: sinon.stub()
			"settings-sharelatex":
				overleaf:
					host: @host = "http://overleaf.example.com"
			"../OAuth/OAuthRequest": @oAuthRequest = {}
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
			@SubscriptionUpdater.refreshFeatures = sinon.stub()
				.callsArgWith(1, null)
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
						@SubscriptionUpdater.refreshFeatures.callCount
					).to.equal 1
					expect(
						@SubscriptionUpdater.refreshFeatures.calledWith(@userId)
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
						@SubscriptionUpdater.refreshFeatures.callCount
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
						@SubscriptionUpdater.refreshFeatures.callCount
					).to.equal 0
					done()

			it 'should not produce an error', (done) ->
				@call (err) =>
					expect(err).to.not.exist
					done()

