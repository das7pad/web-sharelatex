logger = require('logger-sharelatex')
AccountSyncManager = require './AccountSyncManager'


module.exports = AccountSyncController =

	syncHook: (req, res, next) ->
		v1UserIdStr = req.params.v1_user_id
		try
			overleafUserId = parseInt(v1UserIdStr, 10)
		catch err
			logger.err {err, v1UserIdStr},
				"[AccountSync] error parsing overleaf user id from route"
			return next(err)
		# Start this process but proceed immediately with response
		AccountSyncManager.doSync overleafUserId, (err) ->
			if err?
				logger.err {err, overleafUserId}, "[AccountSync] error syncing account"
		return res.sendStatus(200)
