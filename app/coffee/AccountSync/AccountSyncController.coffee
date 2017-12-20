logger = require('logger-sharelatex')
AccountSyncManager = require './AccountSyncManager'


module.exports = AccountSyncController =

	syncHook: (req, res, next) ->
		v1UserIdStr = req.params.v1_user_id
		try
			v1UserId = parseInt(v1UserIdStr, 10)
		catch err
			logger.err {err, v1UserIdStr},
				"[AccountSync] error parsing v1 user id from route"
			return next(err)
		# Start this process but proceed immediately with response
		AccountSyncManager.doSync v1UserId, (err) ->
			if err?
				logger.err {err, v1UserId}, "[AccountSync] error syncing account"
		return res.sendStatus(200)
