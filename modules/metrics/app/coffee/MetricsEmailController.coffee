settings = require('settings-sharelatex')
request = require('request')
minimist = require('minimist')
async = require('async')
EmailHandler = require('../../../../app/js/Features/Email/EmailHandler')
Institution = require('../../../../app/js/models/Institution')
UserGetter = require '../../../../app/js/Features/User/UserGetter'
InstitutionHubsController = require('./InstitutionHubsController')
logger = require 'logger-sharelatex'
moment = require('moment')
require('./MetricsEmailBuilder')

module.exports = MetricsEmailController =

	sendAll: (req, res, next) ->
		# find all the institutions with managers
		Institution.Institution.find { managerIds: $exists: true, $ne: [] }, (error, institutions) ->
			return next(error) if error
			logger.log 'SENDING INSTITUTION METRICS EMAILS FOR', institutions.length, 'INSTITUTIONS'
			async.map institutions, MetricsEmailController.send, (error) ->
				return next(error) if error
				logger.log 'DONE SENDING INSTITUTION METRICS'
				res.send(200)

	send: (institution,  callback) ->
		lastMonth = moment().subtract(1, 'month')
		startDate = moment(lastMonth).startOf('month')
		endDate = moment(lastMonth).endOf('month')

		institution.fetchV1Data (error, entity) ->
			if error
				callback error
			MetricsEmailController._fetchMetrics institution, startDate, endDate, (error, metrics) ->
				# exit out with an error if the metrics didn't load
				if error
					return callback(error)
				async.mapSeries institution.managerIds, ((userId, innerCallback) ->
					UserGetter.getUser userId, {email: 1, first_name: 1}, (error, user) ->
						if error
							return innerCallback(error)
						opts = 
							to: user.email
							userName: user.first_name
							institutionName: entity.name
							hubUrl: "#{settings.siteUrl}/institutions/#{institution.v1Id}/hub"
							metricsUrl: "#{settings.siteUrl}/metrics/institutions/" +
								"#{institution.v1Id}/#{startDate.format('YYYY-M-D')}" +
								"/#{endDate.format('YYYY-M-D')}"
							metrics: metrics
							month: startDate.format('MMMM')
						EmailHandler.sendEmail 'institutionMetricsEmail', opts, (err) ->
							return innerCallback(err)
				), (error) ->
					if error
						return callback(error)
					callback()

	_fetchMetrics: (institution, startDate, endDate, callback) ->
		metrics = {}
		# fetch signups
		query = "?start_date=#{startDate.valueOf() / 1000}" +
			"&end_date=#{endDate.valueOf() / 1000}"
		endpoint = "usage_signup_data#{query}"
		InstitutionHubsController._v1InstitutionsApi institution.v1Id, endpoint, (err, response, body) ->
			callback err if err
			metrics.newUsers = body.count
			MetricsEmailController._recentMetrics institution.v1Id, startDate, endDate, (error, usage) ->
				metrics.usage = usage
				callback null, metrics

	_recentMetrics: (v1Id, startDate, endDate, callback) ->
		keys = [
			'active-users'
			'total-session-duration'
			'editing-sessions'
		]
		usage = {}
		async.mapSeries keys, ((key, innerCallback) ->
			query = "?start_date=#{startDate.valueOf() /1000}" +
				"&end_date=#{endDate.valueOf() / 1000}" +
				"&resource_type=institution&resource_id=#{v1Id}&lag=monthly"
			endpoint = "/graphs/#{key}#{query}"
			request {
				method: 'GET'
				url: settings.apis.analytics.url + endpoint
				json: true
			}, (err, response, body) ->
				if err
					return innerCallback(err)
				if body['data'].length > 0
					usage[key] = body['data'][0].values[0]['y']
				else
					usage[key] = 0
				innerCallback()
		), (error) ->
			callback error, usage
