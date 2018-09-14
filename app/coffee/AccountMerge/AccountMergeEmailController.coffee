UserMapper = require '../OverleafUsers/UserMapper'
UserGetter = require '../../../../../app/js/Features/User/UserGetter'
UserUpdater = require '../../../../../app/js/Features/User/UserUpdater'
OneTimeTokenHandler = require '../../../../../app/js/Features/Security/OneTimeTokenHandler'
logger = require 'logger-sharelatex'
Settings = require 'settings-sharelatex'
{request} = require '../V1SharelatexApi'
Path = require 'path'


module.exports = AccountMergeEmailController =

	renderConfirmMergeFromEmailPage: (req, res, next) ->
		token = req.query.token
		if !token
			return res.status(400).send()
		res.render Path.resolve(__dirname, '../../views/account_merge_page'), {
			token
		}

	renderAccountMergeFromEmailFinishPage: (req, res, next) ->
		{ email, origin } = req.query
		res.render Path.resolve(__dirname, '../../views/account_merge_finish'), {
			email,
			origin
		}

	confirmMergeFromEmail: (req, res, next) ->
		token = req.body.token
		if !token
			return res.status(400).send()
		OneTimeTokenHandler.getValueFromTokenAndExpire 'account-merge-email', token, (err, data) ->
			return next(err) if err?
			if !data
				return res.status(404).send()
			if data.origin not in ['sl', 'ol']
				logger.log {}, "Only sharelatex/overleaf origin supported"
				return res.status(501).send()
			{ sl_id, v1_id, final_email } = data
			UserGetter.getUser sl_id, {_id: 1, overleaf: 1}, (err, user) ->
				return next(err) if err?
				if !user?
					logger.err {userId: sl_id}, 'SL user not found for account-merge'
					return res.status(400).send()
				if user?.overleaf?.id?
					logger.err {userId: sl_id}, 'SL user is already linked to overleaf'
					return res.status(400).send()
				logger.log {sl_id, v1_id, final_email, origin: data.origin},
					"[AccountMergeEmailController] about to merge sharelatex and overleaf-v1 accounts"
				AccountMergeEmailController._getProfile v1_id, (err, v1_profile) ->
					return next(err) if err?
					if v1_profile.email != final_email
						err = new Error('Mismatch between email on profile and final-email in account-merge')
						logger.err {err, v1_id, final_email, profile_email: v1_profile.email},
							"[AccountMergeEmailController] error while preparing to merge accounts"
						return next(err)
					# Merge the user accounts, and deal with emails/affiliations
					UserMapper.mergeWithSlUser sl_id, v1_profile, {emailMismatchOk: true}, (err, user) ->
						return next(err) if err?
						# Explicitely confirm the email just added above
						UserUpdater.confirmEmail sl_id, final_email, new Date(), (err) ->
							return next(err) if err?
							# Set the new default/main email address on the account
							UserUpdater.setDefaultEmailAddress sl_id, final_email, (err) ->
								return next(err) if err?
								res.json(redir: "/account-merge/email/finish?email=#{final_email}&origin=#{data.origin}")

	_getProfile: (v1Id, callback=(err, profile)->) ->
		request {
			method: 'GET',
			url: "#{Settings.apis.v1.url}/api/v1/sharelatex/users/#{v1Id}/profile",
			json: true
		}, (err, resp, body) ->
			return callback(err) if err?
			if resp.statusCode != 200
				return callback(new Error('non-200 status from profile endpoint: #{resp.statusCode}'))
			callback(null, body)
