logger = require 'logger-sharelatex'
ReferencesSearchRouter = require './app/js/ReferencesSearchRouter'

module.exports = ReferencesSearch =
	router: ReferencesSearchRouter

	viewIncludes: {}

	init: () ->
