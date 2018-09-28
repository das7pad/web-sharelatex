{request} = require '../V1SharelatexApi'
logger = require 'logger-sharelatex'
Settings = require 'settings-sharelatex'
_ = require 'lodash'


module.exports = SharelatexAuthHandler =

	createBackingAccount: (user, callback=(err, v1Profile)->) ->
		{email, hashedPassword, first_name, last_name} = user
		logger.log {email}, "sending registration request to v1 login api"
		name = [first_name, last_name].filter((n) -> n?).join(" ")
		confirmedAt = @_getConfirmationTimestamp(user)
		request {
			method: "POST",
			url: "#{Settings.apis.v1.url}/api/v1/sharelatex/register",
			json: {
				email: email,
				encrypted_password: hashedPassword,
				name: name,
				confirmed_at: confirmedAt  # Pass along the confirmation time on this account
			},
			expectedStatusCodes: [409]
		}, (err, response, body) ->
			if err?
				logger.err {email, err}, "error while talking to v1 registration api"
				return callback(err)
			if response.statusCode in [200, 409]
				userProfile = body.user_profile
				logger.log {email, v1UserId: body?.user_profile?.id}, "got response from v1 registration api"
				callback(null, userProfile)
			else
				err = new Error("Unexpected status from v1 registration api: #{response.statusCode}")
				callback(err)

	_getConfirmationTimestamp: (user) ->
		return _.find(user.emails, (e) -> e.email == user.email)?.confirmedAt || null

