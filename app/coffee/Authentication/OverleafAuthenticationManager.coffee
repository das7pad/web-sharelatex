logger = require("logger-sharelatex")
{User} = require "../../../../../app/js/models/User"
request = require "request"
settings = require "settings-sharelatex"
UserMapper = require "../OverleafUsers/UserMapper"

module.exports = OverleafAuthenticationManager =
	getUserProfile: (accessToken, callback) ->
		request.get {
			url: "#{settings.overleaf.host}/api/v1/sharelatex/users/current_user/profile"
			json: true
			headers:
				Authorization: "Bearer #{accessToken}"
		}, (err, res, body) ->
			return cb(err) if err?
			if 200 <= res.statusCode < 300
				callback(null, body)
			else
				err = new Error("non-success code from overleaf: #{res.statusCode}")
				err.statusCode = res.statusCode
				return callback(err)

	# If we've already seen this user, they will be set up with the overleaf.id, so
	# return that user. If not, check that the email doesn't conflict in SL before
	# creating them.
	setupUser: (accessToken, refreshToken, profile, callback = (error, user, info) ->) ->
		logger.log {accessToken, refreshToken, profile}, "authing user via overleaf oauth"
		User.findOne { "overleaf.id": profile.id }, (err, user) ->
			return callback(err) if err?
			if user?
				OverleafAuthenticationManager._updateUserTokens user, accessToken, refreshToken, callback
			else
				email = UserMapper.getCanonicalEmail(profile.email)
				User.findOne {email}, {_id: 1}, (err, user) ->
					return callback(err) if err?
					if user?
						return callback(null, null, {
							email_exists_in_sl: true
							profile, accessToken, refreshToken,
							user_id: user._id.toString()
						})
					else
						UserMapper.createSlUser profile, accessToken, refreshToken, callback

	_updateUserTokens: (user, accessToken, refreshToken, callback = (error, user) ->) ->
		user.overleaf.refreshToken = refreshToken
		user.overleaf.accessToken = accessToken
		user.save (err) ->
			return callback(err) if err?
			return callback(null, user)
