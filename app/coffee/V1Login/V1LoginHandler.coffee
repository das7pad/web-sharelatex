_ = require "lodash"
{request} = require '../V1SharelatexApi'
Settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
{User} = require "../../../../../app/js/models/User"
UserCreator = require "../../../../../app/js/Features/User/UserCreator"


module.exports = V1LoginHandler =

	authWithV1: (options, callback=(err, isValid, v1Profile)->) ->
		log_options = _.cloneDeep(options)
		delete log_options.password
		logger.log {options: log_options}, "sending auth request to v1 login api"
		request {
			method: 'POST'
			url: "#{Settings.overleaf.host}/api/v1/sharelatex/login",
			json: options
			expectedStatusCodes: [403]
		}, (err, response, body) ->
			if err?
				logger.err {options: log_options, err}, "error while talking to v1 login api"
				return callback(err)
			if response.statusCode in [200, 403]
				isValid = body.valid
				userProfile = body.user_profile
				logger.log {options: log_options, isValid, v1UserId: body?.user_profile?.id}, "got response from v1 login api"
				callback(null, isValid, userProfile)
			else
				err = new Error("Unexpected status from v1 login api: #{response.statusCode}")
				callback(err)

	getUserByEmail: (email, callback) ->
		User.findOne {email: email}, {_id: 1, email: 1, overleaf: 1}, callback

	getV1UserIdByEmail: (email, callback) ->
		logger.log {email}, "V1LoginHandler getV1UserIdByEmail"
		request {
			url: "#{Settings.overleaf.host}/api/v1/sharelatex/user_emails"
			qs: {email}
		}, (err, response, body) ->
			logger.log { err, body }, "V1LoginHandler getV1UserIdByEmail Response"
			if err?
				if err.statusCode == 404
					callback null, null
				else
					callback err
			else
				callback(null, body.user_id)

	registerWithV1: (options, callback=(err, created, v1Profile)->) ->
		log_options = _.cloneDeep(options)
		delete log_options.password
		logger.log {options: log_options}, "sending registration request to v1 login api"
		if options.email? && !options.name?
			options.name = options.email.match(/^[^@]*/)[0]
		request {
			method: 'POST'
			url: "#{Settings.overleaf.host}/api/v1/sharelatex/register"
			json: options
			expectedStatusCodes: [409]
		}, (err, response, body) ->
			if err?
				logger.err {options: log_options, err}, "error while talking to v1 registration api"
				return callback(err)
			if response.statusCode in [200, 409]
				created = response.statusCode == 200
				userProfile = body.user_profile
				logger.log {options: log_options, created, v1UserId: body?.user_profile?.id}, "got response from v1 registration api"
				callback(null, created, userProfile)
			else
				err = new Error("Unexpected status from v1 registration api: #{response.statusCode}")
				callback(err)

	doPasswordChange: (options, callback=(err, created)->) ->
		logger.log({v1Id: options.v1Id, email: options.email},
			"sending password change request to v1 login api")
		request {
			method: 'POST'
			url: "#{Settings.overleaf.host}/api/v1/sharelatex/change_password"
			json: {
				user_id: options.v1Id,
				email: options.email,
				current_password: options.current_password,
				password: options.password
			}
			expectedStatusCodes: [403]
		}, (err, response, body) ->
			if err?
				logger.err {email: options.email, err}, "error while talking to v1 password change api"
				return callback(err, false)
			if response.statusCode in [200, 403]
				changed = response.statusCode == 200
				logger.log {email: options.email, changed}, "got response from v1 password change api"
				callback(null, changed)
			else
				err = new Error("Unexpected status from v1 password change api: #{response.statusCode}")
				callback(err, false)
