settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
querystring = require('querystring')
request = require 'request'

UserGetter = require "../../../../app/js/Features/User/UserGetter"

V1UserFinder =
	# Check wether the user has a v1 account but it hasn't linked it yet. This can happen,
	# for instance, if they have accounts in sl and v1 but they only use SL to log in.
	hasV1AccountNotLinkedYet: (userId, callback) ->
		UserGetter.getUser userId, { 'overleaf.id': 1, email: 1 }, (err, user) ->
			if err?
				logger.err {userId}, "error getting user email"
				return callback(err)

			email = user.email

			if !user?.overleaf?.id
				V1UserFinder._findV1UserIdbyEmail email, (err, v1Id) ->
					if err?
						logger.err {userId, email}, "error getting v1 id"
						return callback(err)

					if v1Id?
						return callback(null, email, true)
					else
						return callback(null, email, false)

			else
				return callback(null, email, false)

	_findV1UserIdbyEmail: (email, callback) ->
		logger.log email: email, "searching user by email in v1"

		qs = querystring.stringify({ email: email })

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
				logger.log user_id: body.user_id, "found user id"
				return callback null, body.user_id
			else if response.statusCode == 404
				logger.log "No user found"
				return callback null, null
			else
				error = new Error("overleaf returned non-success code: #{response.statusCode}")
				error.statusCode = response.statusCode
				return callback error

module.exports = V1UserFinder
