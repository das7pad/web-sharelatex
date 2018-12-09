settings = require 'settings-sharelatex'
request = require 'request'
Path = require("path")
logger = require 'logger-sharelatex'
_ = require 'underscore'

module.exports = PublisherHubsController =

	publisherHub: (req, res, next) ->
		{entity} = req
		entity.fetchV1Data (error, publisher) ->
			return next(error) if error?
			PublisherHubsController._fetchTemplates(publisher, (error, templates) ->
				return next(error) if error?
				PublisherHubsController._fetchAnalytics(templates, (analyticsError, analytics) ->
					logger.err {analyticsError}, analyticsError.message if analyticsError
					templatesAnalytics = analytics?.yearly_summary?.v1Templates
					res.render Path.resolve(__dirname, '../views/publisherHub.pug'), {
						name: publisher.name,
						templates: templates,
						templatesAnalytics: templatesAnalytics
					}
				)
			)

	_fetchTemplates: (publisher, callback) ->
		url = "#{settings.apis.v1.url}/api/v2/brands/#{publisher.slug}/templates"
		request.get {
			url: url,
			auth: { user: settings.apis.v1.user, pass: settings.apis.v1.pass }
			json: true
		}, (err, response, body) ->
			callback(err, body)

	_fetchAnalytics: (templates, callback) ->
		docIds = _.map(templates, (template) -> return template.doc_id)
		analyticsUrl = '/recentV1TemplateIdsActivity?v1_templates=' + docIds
		request.get {
			url: settings.apis.analytics.url + analyticsUrl,
			json: true
		}, (err, response, body) ->
			callback(err, body)
