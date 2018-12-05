Settings = require "settings-sharelatex"
User = require("../../models/User").User
{db, ObjectId} = require("../../infrastructure/mongojs")
crypto = require 'crypto'
bcrypt = require 'bcrypt'
EmailHelper = require("../Helpers/EmailHelper")
Errors = require("../Errors/Errors")
UserGetter = require("../User/UserGetter")
V1Handler = require '../V1/V1Handler'

BCRYPT_ROUNDS = Settings?.security?.bcryptRounds or 12

_checkWriteResult = (result, callback = (error, updated) ->) ->
	# for MongoDB
	if result and result.nModified == 1
		callback(null, true)
	else
		callback(null, false)

_setUserPasswordInV2 = (user_id, password, callback) ->
	bcrypt.genSalt BCRYPT_ROUNDS, (error, salt) ->
		return callback(error) if error?
		bcrypt.hash password, salt, (error, hash) ->
			return callback(error) if error?
			db.users.update({
				_id: ObjectId(user_id.toString())
			}, {
				$set: hashedPassword: hash
				$unset: password: true
			}, (updateError, result)->
				return callback(updateError) if updateError?
				_checkWriteResult(result, callback)
			)

_setUserPasswordInV1 = (user, callback) ->
	V1LoginHandler.doPasswordReset user, (error, reset)->
		return callback(error) if error?
		return callback(error, reset)

module.exports = AuthenticationManager =
	authenticate: (query, password, callback = (error, user) ->) ->
		# Using Mongoose for legacy reasons here. The returned User instance
		# gets serialized into the session and there may be subtle differences
		# between the user returned by Mongoose vs mongojs (such as default values)
		User.findOne query, (error, user) =>
			return callback(error) if error?
			if user?
				if user.hashedPassword?
					bcrypt.compare password, user.hashedPassword, (error, match) ->
						return callback(error) if error?
						if match
							AuthenticationManager.checkRounds user, user.hashedPassword, password, (err) ->
								return callback(err) if err?
								callback null, user
						else
							callback null, null
				else
					callback null, null
			else
				callback null, null

	validateEmail: (email) ->
		parsed = EmailHelper.parseEmail(email)
		if !parsed?
			return { message: 'email not valid' }
		return null

	validatePassword: (password) ->
		if !password?
			return { message: 'password not set' }
		if (Settings.passwordStrengthOptions?.length?.max? and
				password.length > Settings.passwordStrengthOptions?.length?.max)
			return { message: "password is too long" }
		if (Settings.passwordStrengthOptions?.length?.min? and
				password.length < Settings.passwordStrengthOptions?.length?.min)
			return { message: 'password is too short' }
		return null

	setUserPassword: (user_id, password, callback = (error, changed) ->) ->
		validation = @validatePassword(password)
		return callback(validation.message) if validation?

		UserGetter.getUser user_id, { email:1, overleaf: 1 }, (error, user) ->
			return callback(error) if error?
			overleafId = user.overleaf?.id?
			if overleafId and Settings.overleaf? # v2 user in v2
				# v2 user in v2, change password in v1
				_setUserPasswordInV1({
					v1Id: user.overleaf.id,
					email: user.email,
					password: password
				}, callback)
			else if overleafId and !Settings.overleaf?
				# v2 user in SL
				return callback(new Errors.NotInV2Error("Password Reset Attempt"))
			else if !overleafId and !Settings.overleaf?
				# SL user in SL, change password in SL
				_setUserPasswordInV2(user_id, password, callback)
			else if !overleafId and Settings.overleaf?
				# SL user in v2, should not happen
				return callback(new Errors.SLInV2Error("Password Reset Attempt"))
			else
				return callback(new Error("Password Reset Attempt Failed"))

	checkRounds: (user, hashedPassword, password, callback = (error) ->) ->
		# check current number of rounds and rehash if necessary
		currentRounds = bcrypt.getRounds hashedPassword
		if currentRounds < BCRYPT_ROUNDS
			AuthenticationManager.setUserPassword user._id, password, callback
		else
			callback()

	_setUserPasswordInV2: (user_id, password, callback) ->
		bcrypt.genSalt BCRYPT_ROUNDS, (error, salt) ->
			return callback(error) if error?
			bcrypt.hash password, salt, (error, hash) ->
				return callback(error) if error?
				db.users.update({
					_id: ObjectId(user_id.toString())
				}, {
					$set: hashedPassword: hash
					$unset: password: true
				}, (updateError, result)->
					return callback(updateError) if updateError?
					_checkWriteResult(result, callback)
				)

	_setUserPasswordInV1: (user, callback) ->
		V1Handler.doPasswordReset user, (error, reset)->
			return callback(error) if error?
			return callback(error, reset)
