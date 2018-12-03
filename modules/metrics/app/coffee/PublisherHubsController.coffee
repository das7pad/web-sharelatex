settings = require 'settings-sharelatex'
request = require 'request'
Path = require("path")
logger = require 'logger-sharelatex'

module.exports = PublisherHubsController =

	publisherHub: (req, res, next) ->
		{entity} = req
		entity.fetchV1Data (error, publisher) ->
			return next(error) if error?
			console.log(publisher.name)
			res.render Path.resolve(__dirname, '../views/publisherHub.pug'), {
				name: publisher.name
			}
