request = require 'request'
settings = require 'settings-sharelatex'
Errors = require "./ProjectImport/Errors"

DEFAULT_V1_PARAMS = {
	auth:
		user: settings.apis.v1.user
		pass: settings.apis.v1.pass
	json: true,
	timeout: 30 * 1000
}

request = request.defaults(DEFAULT_V1_PARAMS)

module.exports = V1SharelatexApi =
	request: (options, callback) ->
		return request(options) if !callback?
		request options, (error, response, body) ->
			return callback(error, response, body) if error?
			if 200 <= response.statusCode < 300 or response.statusCode in (options.expectedStatusCodes or [])
				callback null, response, body
			else if body?.error_code?
				{ error_code, error_message, error_data } = body
				error = Errors.fromErrorCode(error_code, error_message, error_data)
				callback error
			else
				error = new Error("overleaf returned non-success code: #{response.statusCode} for #{options.method} #{options.url}")
				error.statusCode = response.statusCode
				callback error
