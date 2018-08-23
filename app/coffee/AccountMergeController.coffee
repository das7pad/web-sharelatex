ErrorController = require "../../../../app/js/Features/Errors/ErrorController"
AuthenticationManager = require "../../../../app/js/Features/Authentication/AuthenticationManager"
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
Path = require 'path'
jwt = require 'jsonwebtoken'
Settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'

module.exports = AccountMergeController =
	showConfirmAccountMerge: (req, res, next) ->
		{token} = req.query
		if !token?
			return AccountMergeController._badToken(res, new Error('no token provided'))
		jwt.verify token, Settings.accountMerge.secret, (error, data) ->
			return AccountMergeController._badToken(res, error) if error?
			if !data.confirm_merge
				return AccountMergeController._badToken(res, new Error('expected token.confirm_merge == true'))
			if !data.user_id? or !data.overleaf_email?
				return AccountMergeController._badToken(res, new Error('expected user_id and overleaf_email attributes'))
			logger.log {data: data}, "confirming account merge"
			{ user_id, overleaf_email } = data
			res.render Path.resolve(__dirname, "../views/confirm_account_merge"), {
				# Note that logged_in_user_id is allowed to be different from user_id here,
				# we can't guarantee who we are logged in as yet (or if we're logged in at all).
				logged_in_user_id: AuthenticationController.getLoggedInUserId(req)
				merge_user_id: user_id
				overleaf_email: overleaf_email
				token: token
			}
	
	confirmAccountMerge: (req, res, next) ->
		{token} = req.body
		if !token?
			return AccountMergeController._badToken(res, new Error('no token provided'))
		jwt.verify token, Settings.accountMerge.secret, (error, data) ->
			return AccountMergeController._badToken(res, error) if error?
			if !data.confirm_merge
				return AccountMergeController._badToken(res, new Error('expected token.confirm_merge == true'))
			current_user_id = AuthenticationController.getLoggedInUserId(req)
			if !data.user_id? or !data.overleaf_email?
				return AccountMergeController._badToken(res, new Error('expected user_id and overleaf_email attributes'))
			if data.user_id != current_user_id
				return AccountMergeController._badToken(res, new Error('expected token to match logged in user'))
			logger.log {data: data, current_user_id}, "confirmed account merge"
			ol_token = jwt.sign(
				{ user_id: current_user_id, merge_confirmed: true },
				Settings.accountMerge.secret,
				{ expiresIn: '1h' }
			)
			return res.json {
				redir: Settings.accountMerge.betaHost + "/overleaf/confirmed_account_merge?token=#{ol_token}"
			}

	_badToken: (res, error) ->
		logger.err err: error, "bad token in confirming account"
		res.status(400).send("invalid token")
		