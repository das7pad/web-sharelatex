{request} = require '../V1SharelatexApi'
logger = require 'logger-sharelatex'
Settings = require 'settings-sharelatex'


module.exports = SharelatexAuthHandler =

	createBackingAccount: (user, callback=(err, created, v1Profile)->) ->
		{email, hashedPassword, first_name, last_name} = user
		logger.log {email}, "sending registration request to v1 login api"
		name = [first_name, last_name].filter((n) -> n?).join(" ")
		request {
			method: "POST",
			url: "#{Settings.overleaf.host}/api/v1/sharelatex/register",
			json: {email, encrypted_password: hashedPassword, name}
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
