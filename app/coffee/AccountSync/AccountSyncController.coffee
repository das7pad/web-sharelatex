logger = require('logger-sharelatex')


module.exports = AccountSyncController =

	syncHook: (req, res, next) ->
		try
			overleafId = parseInt(req.params.overleaf_user_id)
		catch err
			logger.err {err},
				"[AccountSync] error parsing overleaf user id from route"
			return next(err)
		setTimeout(AccountSyncController._doSync, 0, [overleafId])
		return res.sendStatus(200)

	_doSync: (overleafId) ->
		logger.log {overleafId}, "[AccountSync] starting sync"
