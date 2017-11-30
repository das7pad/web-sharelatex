SandboxedModule = require('sandboxed-module')
assert = require('assert')
require('chai').should()
sinon = require('sinon')
modulePath = require('path').join __dirname, '../../../app/js/DropboxHandler.js'

thirdPartyDataStoreApiUrl = "http://third-party-json-store.herokuapp.com"
siteUrl = "www.sharelatex.com"

describe 'DropboxHandler', ->
	user_id = "123nd3ijdks"

	beforeEach ->
		@stubGet = sinon.stub()
		@stubDel = sinon.stub()
		@projectEntityHandler = flushProjectToThirdPartyDataStore:sinon.stub().callsArgWith(1)
		@ProjectGetter = findAllUsersProjects : sinon.stub()
		@handler = SandboxedModule.require modulePath, requires:
			"settings-sharelatex": {siteUrl:siteUrl, apis: {thirdPartyDataStore: {url: thirdPartyDataStoreApiUrl}}}
			"../../../../app/js/Features/Project/ProjectGetter":@ProjectGetter
			'../../../../app/js/Features/Project/ProjectEntityHandler':@projectEntityHandler
			"request":
				get:@stubGet
				del: @stubDel
			'logger-sharelatex':
				log:->
				err:->


	it 'should be able to get userStatus', (done)->
		body = JSON.stringify({registered:true})
		opts =
			url: "#{thirdPartyDataStoreApiUrl}/user/#{user_id}/dropbox/status"
			timeout: 5000
		@stubGet.withArgs(opts).callsArgWith(1, null, {statusCode:200}, body)
		@handler.getUserRegistrationStatus user_id, (err, status)->
			status.registered.should.equal true
			done()

	it 'should be able to get auth url with callback url on it', (done)->
		url = "http://www.dropbox.com"
		body = JSON.stringify({authorize_url:url})
		opts =
			url: "#{thirdPartyDataStoreApiUrl}/user/#{user_id}/dropbox/register"
			timeout: 5000
		@stubGet.withArgs(opts).callsArgWith(1, null, {statusCode:200}, body)
		@handler.getDropboxRegisterUrl user_id, (err, returnedUrl)->
			returnedUrl.should.equal url
			done()

	it 'should tell the tpds to unlink the account', (done)->
		opts =
			url: "#{thirdPartyDataStoreApiUrl}/user/#{user_id}/dropbox"
			timeout: 5000
		@stubDel.callsArgWith(1, null, {statusCode:200})
		@handler.unlinkAccount user_id, (err)=>
			@stubDel.calledWith(opts).should.equal true
			done()

	it 'should tell the project entity handler to flush project to tpds', (done)->
		user_id = "123u9oijllkj"
		projectList = [{_id:"123lk"}, {_id:"12ji3ojio"}, {_id:"12ji3oddsadasjio", archived:true}, {_id:"2jiojdoi"}, {_id:"not this one", archived:true}, {_id:"2jiojdsasdoi"}]
		collabProjectList = [{_id:"213ds"}, {_id:"12ji3oddsadasjio", archived:true}, {_id:"213dsdsad", archived:false}]
		@ProjectGetter.findAllUsersProjects.callsArgWith(2, null, {owned:projectList, readAndWrite:collabProjectList})
		@handler.flushUsersProjectToDropbox user_id, =>
			@projectEntityHandler.flushProjectToThirdPartyDataStore.calledWith(projectList[0]._id).should.equal true
			@projectEntityHandler.flushProjectToThirdPartyDataStore.calledWith(projectList[1]._id).should.equal true
			@projectEntityHandler.flushProjectToThirdPartyDataStore.calledWith(projectList[3]._id).should.equal true
			@projectEntityHandler.flushProjectToThirdPartyDataStore.calledWith(projectList[5]._id).should.equal true

			@projectEntityHandler.flushProjectToThirdPartyDataStore.calledWith(projectList[2]._id).should.equal false
			@projectEntityHandler.flushProjectToThirdPartyDataStore.calledWith(projectList[4]._id).should.equal false

			@projectEntityHandler.flushProjectToThirdPartyDataStore.calledWith(collabProjectList[0]._id).should.equal true
			@projectEntityHandler.flushProjectToThirdPartyDataStore.calledWith(collabProjectList[1]._id).should.equal false
			@projectEntityHandler.flushProjectToThirdPartyDataStore.calledWith(collabProjectList[2]._id).should.equal true

			done()

