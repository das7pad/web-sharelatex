ErrorController = require "../../../../app/js/Features/Errors/ErrorController"
AuthenticationManager = require "../../../../app/js/Features/Authentication/AuthenticationManager"
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
OneTimeTokenHandler = require '../../../../app/js/Features/Security/OneTimeTokenHandler'
EmailHandler = require '../../../../app/js/Features/Email/EmailHandler'
User = require("../../../../app/js/models/User").User
UserGetter = require('../../../../app/js/Features/User/UserGetter')
Path = require 'path'
jwt = require 'jsonwebtoken'
Settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'
V1UserFinder = require "./V1UserFinder"

module.exports = AccountMergeController =

	sendOverleafAccountMergeEmail: (req, res, next) ->
		userId = AuthenticationController.getLoggedInUserId(req)
		overleafEmail = req.body.overleafEmail
		if !overleafEmail?
			logger.log {userId}, "No Overleaf email supplied"
			return res.sendStatus(400)
		logger.log {userId, overleafEmail}, "Preparing to send account-merge link to overleaf-email"
		User.findOne {email: overleafEmail}, {overleaf: 1}, (err, user) ->
			return next(err) if err?
			if user?
				logger.log {userId, overleafEmail},
					"email matches user account in mongo, cannot send account-merge email"
				return res.status(400).json {errorCode: 'email_matches_v2_user'}
			V1UserFinder._findV1UserIdbyEmail overleafEmail, (err, v1UserId) ->
				return next(err) if err?
				if !v1UserId?
					logger.log {userId, overleafEmail},
						"email does not match any account in v1, cannot send account-merge email"
					return res.status(400).json {errorCode: 'email_not_in_v1'}
				User.findOne {'overleaf.id': v1UserId}, {_id: 1}, (err, userWithV1Id) ->
					return next(err) if err?
					if userWithV1Id?
						logger.log {userId, overleafEmail},
							"email matches user already migrated to v2, cannot send account-merge email"
						return res.status(400).json {errorCode: 'email_matches_v1_user_in_v2'}
					# Send an email with the account-merge token link
					mergeData = {
						v1_id: v1UserId,
						sl_id: userId,
						final_email: overleafEmail,
						origin: 'sl'
					}
					OneTimeTokenHandler.getNewToken 'account-merge-email-to-ol', mergeData, (err, token) ->
						return next(err) if err?
						EmailHandler.sendEmail 'accountMergeToOverleafAddress', {
							origin: 'sl',
							to: overleafEmail,
							tokenLinkUrl: "#{Settings.accountMerge.betaHost}/account-merge/email/confirm?token=#{token}"
						}, () ->

						return res.sendStatus(201)

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
