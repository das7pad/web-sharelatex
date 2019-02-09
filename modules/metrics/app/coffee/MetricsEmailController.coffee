settings = require('settings-sharelatex')
request = require('request')
minimist = require('minimist')
async = require('async')
EmailHandler = require('../../../../app/js/Features/Email/EmailHandler')
Institution = require('../../../../app/js/models/Institution')
User = require('../../../../app/js/models/User')
InstitutionHubsController = require('./InstitutionHubsController')
logger = require 'logger-sharelatex'
require('./MetricsEmailBuilder')

module.exports = MetricsEmailController =

	sendAll: (req, res, next) ->
		# find all the institutions with managers
		Institution.Institution.find { managerIds: $exists: true }, (error, institutions) ->
			if error
				throw error
			logger.log 'SENDING INSTITUTION METRICS EMAILS FOR', institutions.length, 'INSTITUTIONS'
			async.map institutions, MetricsEmailController.send, (error) ->
				return next(error) if error
				logger.log 'DONE SENDING INSTITUTION METRICS'
				res.send(200)

	send: (institution,  callback) ->
		# Day 0 of this month gives last day of previous month
		date = new Date
		endDate = new Date(date.getFullYear(), date.getMonth(), 0)
		date.setMonth date.getMonth() - 1
		startDate = new Date(date.getFullYear(), date.getMonth(), 1)

		institution.fetchV1Data (error, entity) ->
			if error
				callback error
			MetricsEmailController._fetchMetrics institution, startDate, endDate, (error, metrics) ->
				# exit out with an error if the metrics didn't load
				if error
					return callback(error)
				async.mapSeries institution.managerIds, ((userId, innerCallback) ->
					User.User.findOne userId, (error, user) ->
						if error
							return innerCallback(error)
						opts = 
							to: user.email
							userName: user.first_name
							institutionName: entity.name
							hubUrl: "#{settings.siteUrl}/institutions/#{institution.v1Id}/hub"
							metricsUrl: "#{settings.siteUrl}/metrics/institutions/" +
								"#{institution.v1Id}/#{MetricsEmailController._metricsPathDate(startDate)}" +
								"/#{MetricsEmailController._metricsPathDate(endDate)}"
							metrics: metrics
						EmailHandler.sendEmail 'institutionMetricsEmail', opts, ->
							return innerCallback()					
				), (error) ->
					if error
						return callback(error)
					return callback()					

	_metricsPathDate: (date) ->
		# Metrics dashboard uses ISO date format without minutes/seconds
		# js indexes months from 0, so add one
		date.getFullYear() + '-' + date.getMonth() + 1 + '-' + date.getDate()

	_fetchMetrics: (institution, startDate, endDate, callback) ->
		metrics = {}
		# fetch signups
		query = "?start_date=#{startDate.getTime() / 1000}" +
			"&end_date=#{endDate.getTime() / 1000}"
		endpoint = "usage_signup_data#{query}"
		InstitutionHubsController._v1InstitutionsApi institution.v1Id, endpoint, (err, response, body) ->
			if err
				callback err
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
			query = "?start_date=#{startDate.getTime() /1000}" +
				"&end_date=#{endDate.getTime() / 1000}" +
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
			return callback error, null if error
			callback null, usage
