logger = require('logger-sharelatex')

module.exports = ReferencesSearchController =

	search: (req, res) ->
		logger.log {}, "search for references"
		res.send 200
