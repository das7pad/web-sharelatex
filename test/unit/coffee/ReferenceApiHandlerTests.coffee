SandboxedModule = require('sandboxed-module')
assert = require('assert')
require('chai').should()
sinon = require('sinon')
ObjectId = require("mongojs").ObjectId
modulePath = require('path').join __dirname, '../../../app/js/ReferencesApiHandler.js'
stream = require('stream')

describe 'ReferencesApiHandler', ->
	beforeEach ->
		@user =
			features:
				references: true
		@allFiles =
			'/main.tex':  {_id: 'aaa', name: 'main.tex'}
			'/other.tex': {_id: 'bbb', name: 'other.tex'}
		@ReferencesApiHandler = SandboxedModule.require modulePath, requires:
			'request': @request = sinon.stub()
			'settings-sharelatex': @settings =
				apis:
					references:
						url: "http://references.example.com"
				mongo:
					url: "mongodb://localhost/sharelatex"
			'mongojs':
				connect:-> @db = { users: { findOne : sinon.stub().callsArgWith(2, null, { features: {references:true}, refProvider:true}) } }
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
				getAllFiles: sinon.stub().callsArgWith(1, null, @allFiles)
				addFile: sinon.stub()
				replaceFile: sinon.stub().callsArgWith(2, null)
			}
			'../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler': @DocumentUpdaterHandler = {
				setDocument: sinon.stub()
			}
			'../../../../app/js/Features/Editor/EditorRealTimeController': @EditorRealTimeController = {
				emitToRoom: sinon.stub()
			}
			'temp': @temp = {
				track: sinon.stub()
				createWriteStream: sinon.stub()
			}

		@user_id = ObjectId().toString()
		@project_id = ObjectId().toString()

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
			@file =
				_id: ObjectId().toString()
				name: "refProvider.bib"
			@fakeResponseData = '{a: 1}'
			@folder_id = ObjectId().toString()
			@ReferencesApiHandler.userCanMakeRequest = sinon.stub().callsArgWith(2, null, true)
			@readStream = new stream.Readable()
			@readStream._read = () ->
			@writeStream = new stream.Writable()
			@writeStream._write = () ->
			@writeStream.path = '/tmp/whatever'
			@ReferencesApiHandler.make3rdRequestStream = sinon.stub().returns(@readStream)
			@temp.createWriteStream = sinon.stub().returns(@writeStream)
			@ProjectEntityHandler.getAllFiles.callsArgWith(1, null, @allFiles)
			@ProjectEntityHandler.replaceFile.callsArgWith(3, null)
			@ProjectEntityHandler.addFile.callsArgWith(4, null, @file, @folder_id)

		describe 'when all goes well', ->

			describe 'when document is absent', ->

				beforeEach ->
					@ReferencesApiHandler.importBibtex @req, @res, @next
					@readStream.emit('data', 'hi')
					@readStream.emit('end')

				it 'should send back a 201 response', ->
					@res.send.callCount.should.equal 1
					@res.send.calledWith(201).should.equal true

				it 'should not call next with an error', ->
					@next.callCount.should.equal 0

				it 'should call make3rdRequestStream', ->
					@ReferencesApiHandler.make3rdRequestStream.callCount.should.equal 1

				it 'should call getAllFiles', ->
					@ProjectEntityHandler.getAllFiles.callCount.should.equal 1
					@ProjectEntityHandler.getAllFiles.calledWith(@project_id).should.equal true

				it 'should call addFile', ->
					@ProjectEntityHandler.addFile.callCount.should.equal 1
					@ProjectEntityHandler.addFile.calledWith(
						@project_id,
						undefined,
						"refProvider.bib",
						@writeStream.path
					).should.equal true

				it 'should call EditorRealTimeController.emitToRoom', ->
					@EditorRealTimeController.emitToRoom.callCount.should.equal 1
					@EditorRealTimeController.emitToRoom.calledWith(
						@project_id,
						'reciveNewFile',
						@folder_id,
						@file,
						'references-import'
					).should.equal true

				it 'should not call DocumentUpdaterHandler.setDocument', ->
					@DocumentUpdaterHandler.setDocument.callCount.should.equal 0

		# 	describe 'when document is already present', ->

		# 		beforeEach ->
		# 			@allFiles["/refProvider.bib"] = {_id: ObjectId().toString()}
		# 			@ProjectEntityHandler.getAllFiles.callsArgWith(1, null, @allFile)
		# 			@ReferencesApiHandler.importBibtex @req, @res, @next

		# 		it 'should send back a 201 response', ->
		# 			@res.send.callCount.should.equal 1
		# 			@res.send.calledWith(201).should.equal true

		# 		it 'should not call next with an error', ->
		# 			@next.callCount.should.equal 0

		# 		it 'should call make3rdRequest', ->
		# 			@ReferencesApiHandler.make3rdRequest.callCount.should.equal 1

		# 		it 'should call getAllDocs', ->
		# 			@ProjectEntityHandler.getAllDocs.callCount.should.equal 1
		# 			@ProjectEntityHandler.getAllDocs.calledWith(@project_id).should.equal true

		# 		it 'should call DocumentUpdaterHandler.setDocument', ->
		# 			@DocumentUpdaterHandler.setDocument.callCount.should.equal 1
		# 			@DocumentUpdaterHandler.setDocument.calledWith(
		# 				@project_id,
		# 				@allDocs["/refProvider.bib"]._id,
		# 				@user_id,
		# 				@fakeResponseData.split('\n'), 'references-import'
		# 			).should.equal true

		# 		it 'should not call addDoc', ->
		# 			@ProjectEntityHandler.addDoc.callCount.should.equal 0

		# 		it 'should not call EditorRealTimeController.emitToRoom', ->
		# 			@EditorRealTimeController.emitToRoom.callCount.should.equal 0

		# describe 'when user is not allowed to do this', ->

		# 	beforeEach ->
		# 		@ReferencesApiHandler.userCanMakeRequest = sinon.stub().callsArgWith(2, null, false)
		# 		@ReferencesApiHandler.importBibtex @req, @res, @next

		# 	it 'should send back a 403 response', ->
		# 		@res.send.callCount.should.equal 1
		# 		@res.send.calledWith(403).should.equal true

		# 	it 'should not call make3rdRequest', ->
		# 		@ReferencesApiHandler.make3rdRequest.callCount.should.equal 0

		# 	it 'should not call getAllDocs', ->
		# 		@ProjectEntityHandler.getAllDocs.callCount.should.equal 0

		# 	it 'should not call DocumentUpdaterHandler.setDocument', ->
		# 		@DocumentUpdaterHandler.setDocument.callCount.should.equal 0

		# 	it 'should not call addDoc', ->
		# 		@ProjectEntityHandler.addDoc.callCount.should.equal 0

		# 	it 'should not call EditorRealTimeController.emitToRoom', ->
		# 		@EditorRealTimeController.emitToRoom.callCount.should.equal 0

		# describe 'when userCanMakeRequest produces an error', ->

		# 	beforeEach ->
		# 		@err = new Error('woops')
		# 		@ReferencesApiHandler.userCanMakeRequest = sinon.stub().callsArgWith(2, @err)
		# 		@ReferencesApiHandler.importBibtex @req, @res, @next

		# 	it 'should call next with the error', ->
		# 		@next.callCount.should.equal 1
		# 		@next.calledWith(@err).should.equal true

		# 	it 'should not call make3rdRequest', ->
		# 		@ReferencesApiHandler.make3rdRequest.callCount.should.equal 0

		# 	it 'should not call getAllDocs', ->
		# 		@ProjectEntityHandler.getAllDocs.callCount.should.equal 0

		# 	it 'should not call DocumentUpdaterHandler.setDocument', ->
		# 		@DocumentUpdaterHandler.setDocument.callCount.should.equal 0

		# 	it 'should not call addDoc', ->
		# 		@ProjectEntityHandler.addDoc.callCount.should.equal 0

		# 	it 'should not call EditorRealTimeController.emitToRoom', ->
		# 		@EditorRealTimeController.emitToRoom.callCount.should.equal 0

		# describe 'when remote api produces an error', ->

		# 	beforeEach ->
		# 		@err = new Error('woops')
		# 		@ReferencesApiHandler.make3rdRequest = sinon.stub().callsArgWith(1, @err)
		# 		@ReferencesApiHandler.importBibtex @req, @res, @next

		# 	it 'should call next with the error', ->
		# 		@next.callCount.should.equal 1
		# 		@next.calledWith(@err).should.equal true

		# 	it 'should have called userCanMakeRequest', ->
		# 		@ReferencesApiHandler.userCanMakeRequest.callCount.should.equal 1

		# 	it 'should not call getAllDocs', ->
		# 		@ProjectEntityHandler.getAllDocs.callCount.should.equal 0

		# 	it 'should not call DocumentUpdaterHandler.setDocument', ->
		# 		@DocumentUpdaterHandler.setDocument.callCount.should.equal 0

		# 	it 'should not call addDoc', ->
		# 		@ProjectEntityHandler.addDoc.callCount.should.equal 0

		# 	it 'should not call EditorRealTimeController.emitToRoom', ->
		# 		@EditorRealTimeController.emitToRoom.callCount.should.equal 0


		# describe 'when getAllDocs produces an error', ->

		# 	beforeEach ->
		# 		@err = new Error('woops')
		# 		@ProjectEntityHandler.getAllDocs = sinon.stub().callsArgWith(1, @err)
		# 		@ReferencesApiHandler.importBibtex @req, @res, @next

		# 	it 'should call next with the error', ->
		# 		@next.callCount.should.equal 1
		# 		@next.calledWith(@err).should.equal true

		# 	it 'should have called userCanMakeRequest', ->
		# 		@ReferencesApiHandler.userCanMakeRequest.callCount.should.equal 1

		# 	it 'should have called make3rdRequest', ->
		# 		@ReferencesApiHandler.make3rdRequest.callCount.should.equal 1

		# 	it 'should not call DocumentUpdaterHandler.setDocument', ->
		# 		@DocumentUpdaterHandler.setDocument.callCount.should.equal 0

		# 	it 'should not call addDoc', ->
		# 		@ProjectEntityHandler.addDoc.callCount.should.equal 0

		# 	it 'should not call EditorRealTimeController.emitToRoom', ->
		# 		@EditorRealTimeController.emitToRoom.callCount.should.equal 0


		# describe 'when document is present, and setDocument produces an error', ->

		# 	beforeEach ->
		# 		@err = new Error('woops')
		# 		@allDocs["/refProvider.bib"] = {_id: ObjectId().toString(), lines: []}
		# 		@DocumentUpdaterHandler.setDocument = sinon.stub().callsArgWith(5, @err)
		# 		@ReferencesApiHandler.importBibtex @req, @res, @next

		# 	it 'should call next with the error', ->
		# 		@next.callCount.should.equal 1
		# 		@next.calledWith(@err).should.equal true

		# 	it 'should have called userCanMakeRequest', ->
		# 		@ReferencesApiHandler.userCanMakeRequest.callCount.should.equal 1

		# 	it 'should have called make3rdRequest', ->
		# 		@ReferencesApiHandler.make3rdRequest.callCount.should.equal 1

		# 	it 'should have called getAllDocs', ->
		# 		@ProjectEntityHandler.getAllDocs.callCount.should.equal 1

		# 	it 'should not call addDoc', ->
		# 		@ProjectEntityHandler.addDoc.callCount.should.equal 0

		# 	it 'should not call EditorRealTimeController.emitToRoom', ->
		# 		@EditorRealTimeController.emitToRoom.callCount.should.equal 0


		# describe 'when document is absent, and addDoc produces an error', ->

		# 	beforeEach ->
		# 		@err = new Error('woops')
		# 		@ProjectEntityHandler.addDoc.callsArgWith(4, @err)
		# 		@ReferencesApiHandler.importBibtex @req, @res, @next

		# 	it 'should call next with the error', ->
		# 		@next.callCount.should.equal 1
		# 		@next.calledWith(@err).should.equal true

		# 	it 'should have called userCanMakeRequest', ->
		# 		@ReferencesApiHandler.userCanMakeRequest.callCount.should.equal 1

		# 	it 'should have called make3rdRequest', ->
		# 		@ReferencesApiHandler.make3rdRequest.callCount.should.equal 1

		# 	it 'should have called getAllDocs', ->
		# 		@ProjectEntityHandler.getAllDocs.callCount.should.equal 1

		# 	it 'should not call DocumentUpdaterHandler.setDocument', ->
		# 		@DocumentUpdaterHandler.setDocument.callCount.should.equal 0

		# 	it 'should not call EditorRealTimeController.emitToRoom', ->
		# 		@EditorRealTimeController.emitToRoom.callCount.should.equal 0


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
