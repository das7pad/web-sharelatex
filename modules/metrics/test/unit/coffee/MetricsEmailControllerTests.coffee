should = require('chai').should()
SandboxedModule = require('sandboxed-module')
assert = require('assert')
Path = require('path')
modulePath = Path.join __dirname, '../../../app/js/MetricsEmailController'
sinon = require("sinon")
expect = require("chai").expect

describe "MetricsEmailController", ->
	beforeEach ->
    # set date to Jan 2019, so metrics should be for Dec 2018
		@date = new Date(2019,0,15).getTime()
		clock = sinon.useFakeTimers(@date)
		@institution =
			_id: 'mock-institution-id'
			v1Id: 5
			managerIds: [1, 2, 3]
			metricsEmail: {}
			fetchV1Data: (callback) =>
				institution = Object.assign({}, @institution)
				institution.name = 'Stanford'
				callback(null, institution)
			update: sinon.stub().callsArgWith(1, null)

		@getUser = sinon.stub()
		@getUser.onFirstCall().callsArgWith(2, null, {
			_id: 1,
			email: 'firstEmail@test.org',
			first_name: 'one'
		})
		@getUser.onSecondCall().callsArgWith(2, null, {
			_id: 2,
			email: 'secondEmail@test.org',
			first_name: 'two'
		})
		@getUser.onThirdCall().callsArgWith(2, null, {
			_id: 3,
			email: 'thirdEmail@test.org',
			first_name: 'three'
		})
		@sendEmail = sinon.stub().callsArg(2)
		@MetricsEmailController = SandboxedModule.require modulePath, requires:
			'settings-sharelatex':
				siteUrl: 'overleaf.com'
				apis:
					analytics:
						url: 'http://analytics:123456'
					v1:
						url: 'some.host'
						user: 'one'
						pass: 'two'
			'request': @request = sinon.stub().callsArgWith(1, null, null, {data: []})
			'../../../../app/js/Features/Email/EmailHandler': sendEmail: @sendEmail
			'../../../../app/js/Features/User/UserGetter': getUser: @getUser
			'../../../../app/js/models/Institution':
				 Institution: @Institution = find: sinon.stub().callsArgWith(1, null, [@institution])
			'./InstitutionHubsController':
				 _v1InstitutionsApi: sinon.stub().callsArgWith(2, null, null, {count: 12})
			'./MetricsEmailBuilder': sinon.stub()
		@req = {}
		@res = sendStatus: sinon.stub()

	it 'sends the metrics emails', (done) ->
		@MetricsEmailController.sendAll(@req, @res)
		@res.sendStatus.calledOnce.should.equal true
		@res.sendStatus.calledWith(200).should.equal true
		@getUser.calledThrice.should.equal true
		@sendEmail.calledThrice.should.equal true
		@sendEmail.lastCall.args[0].should.equal 'institutionMetricsEmail'

		sendOpts = @sendEmail.lastCall.args[1]
		sendOpts.to.should.equal 'thirdEmail@test.org'
		sendOpts.userName.should.equal 'three'
		sendOpts.institutionName.should.equal 'Stanford'
		sendOpts.hubUrl.should.equal 'overleaf.com/institutions/5/hub'
		sendOpts.metricsUrl.should.equal 'overleaf.com/metrics/institutions/5/2018-12-1/2018-12-31'
		sendOpts.metrics.newUsers.should.equal 12
		sendOpts.metrics.usage['active-users'].should.equal 0
		sendOpts.month.should.equal 'December'

		done()

	it 'should not send the metrics emails twice in a month', (done) ->
		#send the emails
		@MetricsEmailController.sendAll(@req, @res)
		@institution.metricsEmail.lastSent = @date
		@MetricsEmailController.sendAll(@req, @res)

		@res.sendStatus.calledTwice.should.equal true
		@res.sendStatus.calledWith(200).should.equal true
		# only 3 emails should be sent, not 6
		@getUser.calledThrice.should.equal true
		@sendEmail.calledThrice.should.equal true

		done()
