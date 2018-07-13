request = require '../request'
Settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
{User} = require "../../../../../app/js/models/User"
UserCreator = require "../../../../../app/js/Features/User/UserCreator"


module.exports = V1LoginHandler =

	authWithV1: (email, pass, callback=(err, isValid, v1Profile)->) ->
		logger.log {email}, "sending auth request to v1 login api"
		request.post {
			url: "#{Settings.overleaf.host}/api/v1/sharelatex/login",
			json: {email, pass}
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

	# nextAction = 'login' || null
	# handleAuthSuccess: (email, v1Profile, callback=(err, nextAction, user)->) ->
	# 	v1UserId = v1Profile.id
	# 	@findUserWithEmail email, (err, emailUser) =>
	# 		return callback(err) if err?
	# 		@findUserWithV1UserId v1Profile.id, (err, v1User) =>
	# 			return callback(err) if err?

	# 			# Have records matching both email and v1Id in the database
	# 			if emailUser? && v1User?
	# 				logger.log {email, v1UserId}, "found user records for both email and v1 id"
	# 				if emailUser._id.toString() == v1User._id.toString()
	# 					logger.log {email, v1UserId}, "same user record for email and v1 id"
	# 					# Proceed, log this user in
	# 					callback(null, 'login', emailUser)
	# 				else
	# 					logger.log {email, v1UserId}, "different user record for email and v1 id"
	# 					return callback(new Error('no'))

	# 			# Match for only email
	# 			else if emailUser?
	# 				logger.log {email, v1UserId}, "found user record for email"
	# 				if emailUser?.overleaf?.id?
	# 					# Matches an email address which is linked to another v1 user account
	# 					logger.log {email, v1UserId, otherV1UserId: emailUser.overleaf.id},
	# 						"email is in use on account linked to another v1 user"
	# 				# Refuse?
	# 				return callback(new Error('no'))

	# 			# Match for only v1Id
	# 			else if v1User?
	# 				logger.log {email, v1UserId}, "found user record for v1 id"
	# 				# Refuse?
	# 				return callback(new Error('no'))

	# 			# No matches in database
	# 			else
	# 				logger.log {email, v1UserId}, "did not find existing user record"
	# 				# Create new User, log in
	# 				@createUser email, v1Profile, (err, newUser) =>
	# 					return callback(err) if err?
	# 					callback(null, 'login', newUser)

	# findUserWithEmail: (email, callback=(err, user)->) ->
	# 	User.findOne {email: email}, {}, callback

	# findUserWithV1UserId: (v1UserId, callback=(err, user)->) ->
	# 	User.findOne {'overleaf.id': v1UserId}, {}, callback

	# createUser: (email, v1Profile, callback=(err, newUser)->) ->
	# 	newUserSpec = {
	# 		overleaf: {
	# 			id: v1Profile.id
	# 		},
	# 		email: email,
	# 		ace:
	# 			theme: 'overleaf'
	# 	}
	# 	UserCreator.createNewUser newUserSpec, callback
