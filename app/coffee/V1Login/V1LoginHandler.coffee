{request} = require '../V1SharelatexApi'
Settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
{User} = require "../../../../../app/js/models/User"
UserCreator = require "../../../../../app/js/Features/User/UserCreator"


module.exports = V1LoginHandler =

	authWithV1: (email, password, callback=(err, isValid, v1Profile)->) ->
		logger.log {email}, "sending auth request to v1 login api"
		request {
			method: 'POST'
			url: "#{Settings.overleaf.host}/api/v1/sharelatex/login",
			json: {email, password}
			expectedStatusCodes: [403]
		}, (err, response, body) ->
			if err?
				logger.err {email, err}, "error while talking to v1 login api"
				return callback(err)
			if response.statusCode in [200, 403]
				isValid = body.valid
				userProfile = body.user_profile
				logger.log {email, isValid, v1UserId: body?.user_profile?.id}, "got response from v1 login api"
				callback(null, isValid, userProfile)
			else
				err = new Error("Unexpected status from v1 login api: #{response.statusCode}")
				callback(err)

	getUserByEmail: (email, callback) ->
		User.findOne {email: email}, {_id: 1, email: 1, overleaf: 1}, callback

	registerWithV1: (email, password, callback=(err, created, v1Profile)->) ->
		logger.log {email}, "sending registration request to v1 login api"
		name = email.match(/^[^@]*/)[0]
		request {
			method: 'POST'
			url: "#{Settings.overleaf.host}/api/v1/sharelatex/register",
			json: {email, password, name}
			expectedStatusCodes: [409]
		}, (err, response, body) ->
			if err?
				logger.err {email, err}, "error while talking to v1 registration api"
				return callback(err)
			if response.statusCode in [200, 409]
				created = body.created
				userProfile = body.user_profile
				logger.log {email, created, v1UserId: body?.user_profile?.id}, "got response from v1 registration api"
				callback(null, created, userProfile)
			else
				err = new Error("Unexpected status from v1 registration api: #{response.statusCode}")
				callback(err)
