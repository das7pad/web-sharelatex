SandboxedModule = require('sandboxed-module')
assert = require('assert')
require('chai').should()
sinon = require('sinon')
ObjectId = require("mongojs").ObjectId
modulePath = require('path').join __dirname, '../../../app/js/ReferencesApiHandler.js'
stream = require('stream')

describe 'ReferencesApiHandler', ->
	beforeEach ->
		@user_id = ObjectId().toString()
		@project_id = ObjectId().toString()
		@user =
			_id: @user_id
			features:
				mendeley: true
				refProvider: true
		@allFiles =
			'/main.tex':  {_id: 'aaa', name: 'main.tex'}
			'/other.tex': {_id: 'bbb', name: 'other.tex'}
		@db = {
			users: {
				findOne : sinon.stub().callsArgWith(2, null, { features: {mendeley:true}, refProvider:true})
			}
		}
		@mongojs = () =>
			@db
		@mongojs.ObjectId = ObjectId

		@ReferencesApiHandler = SandboxedModule.require modulePath, requires:
			'request': @request = sinon.stub()
			'fs': @fs = {unlink: sinon.stub().callsArgWith(1, null)}
			'settings-sharelatex': @settings =
				apis:
					references:
						url: "http://references.example.com"
				mongo:
					url: "mongodb://localhost/sharelatex"
			'mongojs': @mongojs
			'../../../../app/js/Features/User/UserUpdater': @UserUpdater =
				updateUser: sinon.stub().callsArgWith(2, null)
			'logger-sharelatex': @logger =
				log:->
				err:->
			'../../../../app/js/Features/User/UserGetter': @UserGetter = {
				getUser: sinon.stub().callsArgWith(1, null, @user)
			}
			'../../../../app/js/Features/Editor/EditorController': @EditorController = {
				upsertFileWithPath: sinon.stub().yields()
			}
			'temp': @temp = {
				track: sinon.stub()
				createWriteStream: sinon.stub()
			}
			'../../../../app/js/Features/Authentication/AuthenticationController': @AuthenticationController =
				getLoggedInUserId: sinon.stub().returns(@user_id)

		@req =
			session:
				user:
					_id: @user_id
			params:
				ref_provider: 'refProvider'
				Project_id: @project_id
		@res =
			redirect: sinon.stub()
			json: sinon.stub()
			sendStatus: sinon.stub()
			send: sinon.stub()
		@next = sinon.stub()

	describe "startAuth", ->
		beforeEach ->
			@redirect = "http://localhost/tokenexchange"
			@ReferencesApiHandler.make3rdRequest = sinon.stub().callsArgWith(1, null, {}, {redirect: @redirect} )
			@ReferencesApiHandler.startAuth @req, @res

		it "should redirect to the complete auth url", ->
			@res.redirect.calledWith(@redirect).should.equal true

	describe "completeAuth", ->
		beforeEach ->
			@ReferencesApiHandler.make3rdRequest = sinon.stub().callsArgWith(1, null, {}, {} )
			@ReferencesApiHandler.completeAuth @req, @res

		it "should redirect to user settings page", ->
			@res.redirect.calledWith("/user/settings").should.equal true

	describe "unlink", ->
		beforeEach ->
			@ReferencesApiHandler.make3rdRequest = sinon.stub().callsArgWith(1, null, {}, {} )
			@ReferencesApiHandler.unlink @req, @res

		it "should make a request to unlink the user", ->
			@ReferencesApiHandler.make3rdRequest
				.calledWith({
					method: 'delete',
					url: "/user/#{@user_id}/refProvider"
				})
				.should.equal true

		it "should redirect to user settings page", ->
			@res.redirect.calledWith("/user/settings").should.equal true

	describe 'importBibtex', ->
		beforeEach ->
			@file =
				_id: ObjectId().toString()
				name: "refProvider.bib"
			@fakeResponseData = '{a: 1}'
			@fs.unlink = sinon.stub().callsArgWith(1, null)
			@folder_id = ObjectId().toString()
			@ReferencesApiHandler.userCanMakeRequest = sinon.stub().callsArgWith(2, null, true)
			@readStream = new stream.Readable()
			@readStream._read = () ->
			@writeStream = new stream.Writable()
			@writeStream._write = () ->
			@writeStream.path = '/tmp/whatever'
			@writeStream.destroy = sinon.stub()
			@ReferencesApiHandler.make3rdRequestStream = sinon.stub().returns(@readStream)
			@temp.createWriteStream = sinon.stub().returns(@writeStream)

		describe 'when all goes well', ->
			beforeEach ->
				@ReferencesApiHandler.importBibtex @req, @res, @next
				@readStream.emit('data', 'hi')
				@readStream.emit('end')

			it 'should send back a 201 response', ->
				@res.sendStatus.callCount.should.equal 1
				@res.sendStatus.calledWith(201).should.equal true

			it 'should not call next with an error', ->
				@next.callCount.should.equal 0

			it 'should call upsertFileWithPath', ->
				@EditorController.upsertFileWithPath.callCount.should.equal 1
				@EditorController.upsertFileWithPath.calledWith(
					@project_id,
					"/refProvider.bib",
					@writeStream.path,
					null,
					"references-import",
					@user_id
				).should.equal true

			it 'should call fs.unlink', ->
				@fs.unlink.callCount.should.equal 1
				@fs.unlink.calledWith(@writeStream.path).should.equal true

		describe 'when fs.unlink produces an error', ->
			beforeEach ->
				@next = sinon.stub()
				@fs.unlink = sinon.stub().callsArgWith(1, new Error('woops'))
				@ReferencesApiHandler.importBibtex @req, @res, @next
				@readStream.emit('data', 'hi')
				@readStream.emit('end')

			it 'should call next with an error', ->
				@next.callCount.should.equal 1
				@next.lastCall.args[0].should.be.instanceof Error

			it 'should not send back a 201 response', ->
				@res.sendStatus.callCount.should.equal 0
				@res.sendStatus.calledWith(201).should.equal false

		describe 'when user is not allowed to do this', ->
			beforeEach ->
				@ReferencesApiHandler.userCanMakeRequest = sinon.stub().callsArgWith(2, null, false)
				@ReferencesApiHandler.importBibtex @req, @res, @next

			it 'should send back a 403 response', ->
				@res.sendStatus.callCount.should.equal 1
				@res.sendStatus.calledWith(403).should.equal true

			it 'should not call make3rdRequestStream', ->
				@ReferencesApiHandler.make3rdRequestStream.callCount.should.equal 0

			it 'should call upsertFileWithPath', ->
				@EditorController.upsertFileWithPath.callCount.should.equal 0

			it 'should not call fs.unlink', ->
				@fs.unlink.callCount.should.equal 0

		describe 'when userCanMakeRequest produces an error', ->
			beforeEach ->
				@err = new Error('woops')
				@ReferencesApiHandler.userCanMakeRequest = sinon.stub().callsArgWith(2, @err)
				@ReferencesApiHandler.importBibtex @req, @res, @next

			it 'should call next with the error', ->
				@next.callCount.should.equal 1
				@next.calledWith(@err).should.equal true

			it 'should not call make3rdRequestStream', ->
				@ReferencesApiHandler.make3rdRequestStream.callCount.should.equal 0

			it 'should call upsertFileWithPath', ->
				@EditorController.upsertFileWithPath.callCount.should.equal 0

			it 'should not call fs.unlink', ->
				@fs.unlink.callCount.should.equal 0

		describe 'when remote api produces an error', ->
			beforeEach ->
				@err = new Error('woops')
				@ReferencesApiHandler.importBibtex @req, @res, @next
				@readStream.emit('data', 'hi')
				@readStream.emit('error', @err)

			it 'should call next with the error', ->
				@next.callCount.should.equal 1
				@next.calledWith(@err).should.equal true

			it 'should have called userCanMakeRequest', ->
				@ReferencesApiHandler.userCanMakeRequest.callCount.should.equal 1

			it 'should call upsertFileWithPath', ->
				@EditorController.upsertFileWithPath.callCount.should.equal 0

			it 'should call fs.unlink', ->
				@fs.unlink.callCount.should.equal 1
				@fs.unlink.calledWith(@writeStream.path).should.equal true

		describe 'upsertFileWithPath produces an error', ->
			beforeEach ->
				@err = new Error('woops')
				@fs.unlink = sinon.stub().callsArgWith(1, null)
				@EditorController.upsertFileWithPath.yields(@err)
				@ReferencesApiHandler.importBibtex @req, @res, @next
				@readStream.emit('data', 'hi')
				@readStream.emit('end')

			it 'should call next with the error', ->
				@next.callCount.should.equal 1
				@next.calledWith(@err).should.equal true

			it 'should have called userCanMakeRequest', ->
				@ReferencesApiHandler.userCanMakeRequest.callCount.should.equal 1

			it 'should have called make3rdRequestStream', ->
				@ReferencesApiHandler.make3rdRequestStream.callCount.should.equal 1

			it 'should call fs.unlink', ->
				@fs.unlink.callCount.should.equal 1
				@fs.unlink.calledWith(@writeStream.path).should.equal true

	describe 'bibtex', ->

		beforeEach ->
			@fakeResponseData = '{a: 1}'
			@ReferencesApiHandler.userCanMakeRequest = sinon.stub().callsArgWith(2, null, true)
			@ReferencesApiHandler.make3rdRequest = sinon.stub().callsArgWith(
				1,
				null,
				{statusCode: 200},
				@fakeResponseData
			)

		describe 'when all goes well', ->

			beforeEach ->
				@ReferencesApiHandler.bibtex @req, @res

			it 'should send json data', ->
				@res.json.callCount.should.equal 1
				@res.json.calledWith(@fakeResponseData).should.equal true

		describe 'when user cannot make the request', ->

			beforeEach ->
				@ReferencesApiHandler.userCanMakeRequest = sinon.stub().callsArgWith(2, null, false)
				@ReferencesApiHandler.bibtex @req, @res, @next

			it 'should send 403', ->
				@res.send.callCount.should.equal 1
				@res.send.calledWith(403).should.equal true

		describe 'when userCanMakeRequest produces an error', ->

			beforeEach ->
				@ReferencesApiHandler.userCanMakeRequest = sinon.stub().callsArgWith(2, new Error('woops'))
				@ReferencesApiHandler.bibtex @req, @res, @next

			it 'should pass error to next handler', ->
				@next.callCount.should.equal 1
				@next.firstCall.args[0].should.be.instanceof Error

		describe 'when remote request fails', ->

			beforeEach ->
				@ReferencesApiHandler.make3rdRequest = sinon.stub().callsArgWith(1, new Error('woops'))
				@ReferencesApiHandler.bibtex @req, @res, @next

			it 'should pass error to next handler', ->
				@next.callCount.should.equal 1
				@next.firstCall.args[0].should.be.instanceof Error
