should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
Path = require('path')
modulePath = Path.join __dirname, '../../../app/js/HubsController'
sinon = require("sinon")
expect = require("chai").expect

describe "HubsController", ->
	beforeEach ->
		@HubsController = SandboxedModule.require modulePath, requires:
			'settings-sharelatex': @Settings =
				apis:
					analytics:
						url: 'http://analytics:123456'
					v1:
						url: 'some.host'
						user: 'one'
						pass: 'two'
			'request': @request = sinon.stub()
			'../../../../app/js/Features/Institutions/InstitutionsGetter': @InstitutionsGetter = {}
			'logger-sharelatex':
				err: sinon.stub()
				log: sinon.stub()
		@req = entity: v1Id: 5

	describe "institutionHub", ->
		it 'renders the institution hub template', (done) ->
			@res = { render: sinon.stub() }
			metadata = "{\"name\": \"Stanford\", \"portal_slug\": \"slug\"}"
			usageData = "{\"count\": 10}"
			recentActivity = "[{\"title\": \"yesterday\"}]"
			@request.get	= sinon.stub().callsArgWith(1, null, null, metadata)
			@HubsController._usageData = sinon.stub().callsArgWith(1, usageData)
			@HubsController._recentActivity = sinon.stub().callsArgWith(1, recentActivity)

			@HubsController.institutionHub(@req, @res)
			@res.render.calledWith(
				sinon.match('views/institutionHub'), {
					institutionId: 5,
					institutionName: 'Stanford',
					portalSlug: 'slug',
					resourceType: 'institution',
					usageData: usageData,
					recentActivity: recentActivity
				}
			).should.equal true

			done()

	# describe "v1 api proxies", ->
  #   beforeEach ->
  #     @request.get = sinon.spy(sinon.stub.callsArgWith(1, null, null, "[{\"validJson\": \"true\"}]"))
  #     @res = { send: sinon.stub() }

  #   it 'calls correct endpoint for external collaboration', (done) ->
  #     @HubsController.institutionExternalCollaboration(@req, @res)
  #     @request.get.args
  #     #@request.calledWith({url:
