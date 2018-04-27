settings = require 'settings-sharelatex'
querystring = require('querystring')
request = require 'request'

module.exports =
	findV1UserIdbyEmail: (email, callback) ->
		qs = querystring.stringify({email: email})

		request {
			method: 'GET',
			url: "#{settings.apis.v1.url}/api/v1/sharelatex/user_emails?#{qs}"
			auth:
				user: settings.apis.v1.user
				pass: settings.apis.v1.pass
			json: true,
			timeout: 5 * 1000
		}, (error, response, body) ->
			return callback(error) if error?

			if 200 <= response.statusCode < 300
				return callback null, body.user_id
			else if response.statusCode == 404
				return callback null, null
			else
				error = new Error("overleaf returned non-success code: #{response.statusCode}")
				error.statusCode = response.statusCode
				return callback error
