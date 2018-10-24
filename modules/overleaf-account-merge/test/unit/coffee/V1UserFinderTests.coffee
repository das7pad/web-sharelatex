should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
Path = require('path')
modulePath = Path.join __dirname, '../../../app/js/V1UserFinder'
sinon = require("sinon")
expect = require("chai").expect

describe "V1UserFinder", ->
	beforeEach ->
		@V1UserFinder = SandboxedModule.require modulePath, requires:
			"logger-sharelatex": { log: sinon.stub(), err: sinon.stub() }
			"request": @request = sinon.stub()
			"../../../../app/js/Features/User/UserGetter":
				@UserGetter = {
					getUser: (userId, projection, callback) => callback(null, @user)
				}

			"settings-sharelatex": @settings =
				apis:
					v1:
						user: "scott"
						password: "tiger"

		@user = email: "admin@example.com", overleaf: { }
		@request.reset()

	describe "hasV1AccountNotLinkedYet", ->
		describe "when there's a v1 account not linked", ->
			beforeEach ->
				@request.callsArgWith(1, null, { statusCode: 200 }, { user_id: 123 } )

			it "returns true and the account email", (done) ->
				@V1UserFinder.hasV1AccountNotLinkedYet 'abc', (err, email, hasNotLinkedV1account) =>
					expect(err).to.eq(null)
					expect(@request.callCount).to.equal(1)
					expect(hasNotLinkedV1account).to.equal(true)
					expect(email).to.equal("admin@example.com")
					done()

		describe "when there's a v1 account already linked", ->
			beforeEach ->
				@user.overleaf.id = 543

			it "returns false and the user email", (done) ->
				@V1UserFinder.hasV1AccountNotLinkedYet 'abc', (err, email, hasNotLinkedV1account) =>
					expect(err).to.eq(null)
					expect(@request.callCount).to.equal(0)
					expect(hasNotLinkedV1account).to.equal(false)
					expect(email).to.equal("admin@example.com")
					done()

		describe "when there's no v1 account", ->
			beforeEach ->
				@request.callsArgWith(1, null, { statusCode: 404 } )

			it "returns false", (done) ->
				@V1UserFinder.hasV1AccountNotLinkedYet 'abc', (err, email, hasNotLinkedV1account) =>
					expect(err).to.eq(null)
					expect(@request.callCount).to.equal(1)
					expect(hasNotLinkedV1account).to.equal(false)
					expect(email).to.equal("admin@example.com")
					done()

		describe "when there's an error", ->
			beforeEach ->
				@request.callsArgWith(1, new Error('woops'), { statusCode: 500 })

			it "return an error", (done) ->
				@V1UserFinder.hasV1AccountNotLinkedYet 'abc', (err, email, hasNotLinkedV1account) =>
					expect(err).to.be.instanceof(Error)
					done()
