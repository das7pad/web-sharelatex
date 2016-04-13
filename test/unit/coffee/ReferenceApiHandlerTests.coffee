SandboxedModule = require('sandboxed-module')
assert = require('assert')
require('chai').should()
sinon = require('sinon')
ObjectId = require("mongojs").ObjectId
modulePath = require('path').join __dirname, '../../../app/js/ReferencesApiHandler.js'

describe 'ReferencesApiHandler', ->
	beforeEach ->
		@user =
			features:
				refProvider: true
		@allDocs =
			'/main.tex':  {_id: 'aaa', name: 'main.tex',  lines: ['one', 'two', 'three']}
			'/other.tex': {_id: 'bbb', name: 'other.tex', lines: ['four', 'five']}
		@ReferencesApiHandler = SandboxedModule.require modulePath, requires:
			'request': @request = sinon.stub()
			'settings-sharelatex': @settings =
				apis:
					references:
						url: "http://references.example.com"
				mongo:
					url: "mongodb://localhost/sharelatex"
			'mongojs':
				connect:-> @db = { users: { findOne : sinon.stub().callsArgWith(2, null, { features: {refProvider:true}, refProvider:true}) } }
				ObjectId: ObjectId
			'../../../../app/js/Features/User/UserUpdater': @UserUpdater =
				updateUser: sinon.stub().callsArgWith(2, null)
			'logger-sharelatex': @logger =
				log:->
				err:->
			'../../../../app/js/Features/User/UserGetter': @UserGetter = {
				getUser: sinon.stub().callsArgWith(1, null, @user)
			}
			'../../../../app/js/Features/Project/ProjectEntityHandler': @ProjectEntityHandler = {
				getAllDocs: sinon.stub().callsArgWith(1, null, @allDocs)
				addDoc: sinon.stub()
			}
			'../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler': @DocumentUpdaterHandler = {
				setDocument: sinon.stub()
			}
			'../../../../app/js/Features/Editor/EditorRealTimeController': @EditorRealTimeController = {
				emitToRoom: sinon.stub()
			}

		@user_id = ObjectId().toString()
		@project_id = ObjectId().toString()

		@req =
			session:
				user:
					_id: @user_id
			params:
				ref_provider: 'refProvider'
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

	describe "makeRefRequest", ->

		it "should call request with right params", ->
			@opts =
				url: "/someUrl"
			@ReferencesApiHandler.makeRefRequest @opts
			@opts.url = "#{@settings.apis.references.url}#{@opts.url}"
			@request.calledWith(@opts).should.equal true

	describe "unlink", ->
		beforeEach ->
			@update =
				$unset:
					refProviders:
						refProvider: true

			@ReferencesApiHandler.unlink @req, @res, @next

		it "should unset user reference info", ->
			@UserUpdater.updateUser.calledWith(@user_id, @update).should.equal true

		it "should redirect to user settings page", ->
			@res.redirect.calledWith("/user/settings").should.equal true

	describe 'importBibtex', ->

		beforeEach ->
			@doc =
				_id: ObjectId().toString()
				name: "#{@ref_provider}.bib"
				lines: []
			@fakeResponseData = '{a: 1}'
			@folder_id = ObjectId().toString()
			@ReferencesApiHandler.userCanMakeRequest = sinon.stub().callsArgWith(2, null, true)
			@ReferencesApiHandler.make3rdRequest = sinon.stub().callsArgWith(
				1,
				null,
				{statusCode: 200},
				@fakeResponseData
			)
			@ProjectEntityHandler.getAllDocs.callsArgWith(1, null, @allDocs)
			@DocumentUpdaterHandler.setDocument.callsArgWith(5, null)
			@ProjectEntityHandler.addDoc.callsArgWith(4, null, @doc, @folder_id)

		describe 'when all goes well', ->

			describe 'when document is already present', ->

				beforeEach ->
					@allDocs["/#{@refProvider}.bib"] = {_id: ObjectId().toString(), lines: []}
					@ReferencesApiHandler.importBibtex @req, @res, @next

				it 'should send back a 201 response', ->
					@res.send.callCount.should.equal 1
					@res.send.calledWith(201).should.equal true

			describe 'when document is absent', ->

				beforeEach ->

		describe 'when user is not allowed to do this', ->

		describe 'when remote api produces an error', ->

		describe 'when getAllDocs produces an error', ->

		describe 'when setDocument produces an error', ->

		describe 'when addDoc produces an error', ->





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
