logger = require("logger-sharelatex")
{User} = require "../../../../../app/js/models/User"
request = require "request"
settings = require "settings-sharelatex"
UserMapper = require "../OverleafUsers/UserMapper"
FeaturesUpdater = require("../../../../../app/js/Features/Subscription/FeaturesUpdater")

module.exports = OverleafAuthenticationManager =
	getUserProfile: (accessToken, callback) ->
		request.get {
			url: "#{settings.v1Api.host}/api/v1/sharelatex/users/current_user/profile"
			json: true
			headers:
				Authorization: "Bearer #{accessToken}"
		}, (err, res, body) ->
			return callback(err) if err?
			if 200 <= res.statusCode < 300
				callback(null, body)
			else
				err = new Error("non-success code from overleaf: #{res.statusCode}")
				err.statusCode = res.statusCode
				return callback(err)

	# If we've already seen this user, they will be set up with the overleaf.id, so
	# return that user. If not, check that the email doesn't conflict in SL before
	# creating them.
	setupUser: (profile, callback = (error, user, info) ->) ->
		logger.log {profile}, "Set up v1 user"
		User.findOne { "overleaf.id": profile.id }, (err, user) ->
			return callback(err) if err?
			if user?
				# User is present in database for this v1UserId
				# OverleafAuthenticationManager._updateUserTokens user, accessToken, refreshToken, callback
				callback(null, user, null)
			else
				# User not present in database for this v1UserId, check against email too
				email = UserMapper.getCanonicalEmail(profile.email)
				User.findOne {email}, {_id: 1}, (err, user) ->
					return callback(err) if err?
					if user?
						# Found a user for this email,
						# bail out to the merge-sl-account flow
						return callback(null, null, {
							email_exists_in_sl: true
							profile,
							user_id: user._id.toString()
						})
					else
						# No user for either v1UserId nor Email, create and sign in
						UserMapper.createSlUser profile, (err, sl_user) ->
							return callback(err) if err?
							FeaturesUpdater.refreshFeatures(sl_user._id, false)
							callback(null, sl_user)

	setupOAuthUser: (accessToken, refreshToken, profile, callback=(error, user, info)->) ->
		# Note: we drop the tokens at this point
		OverleafAuthenticationManager.setupUser(profile, callback)

	_updateUserTokens: (user, accessToken, refreshToken, callback = (error, user) ->) ->
		user.overleaf.refreshToken = refreshToken
		user.overleaf.accessToken = accessToken
		user.save (err) ->
			return callback(err) if err?
			return callback(null, user)
