request = require 'request'
settings = require 'settings-sharelatex'

DEFAULT_V1_PARAMS = {
	auth:
		user: settings.apis.v1.user
		pass: settings.apis.v1.pass
	json: true,
	timeout: 5 * 1000
}

module.exports = request.defaults(DEFAULT_V1_PARAMS)
