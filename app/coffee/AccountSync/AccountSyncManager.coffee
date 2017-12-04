UserGetter = require('../../../../../app/js/Features/User/UserGetter')
Settings = require('settings-sharelatex')
request = require('request')
logger = require('logger-sharelatex')


module.exports = AccountSyncManager =

	# planCode = 'ol_pro' | 'ol_pro_plus' | null
	getPlanNameFromOverleaf: (userId, callback=(err, planCode)->) ->
		UserGetter.getUser userId, {'overleaf.id': 1}, (err, user) ->
			return callback(err) if err?
			overleafId = user?.overleaf?.id
			if !overleafId?
				err = new Error('no overleaf id found for user')
				logger.err {err, userId}, "[AccountSync] no overleaf id found for user"
				return callback(err)
			AccountSyncManager._overleafPlanRequest overleafId, (err, response, body) ->
				return callback(err) if err?
				if response.statusCode != 200
					err = new Error("Got non-200 response from overleaf: #{response.statusCode}")
					logger.err {err, userId, overleafId},
						"[AccountSync] got non-200 response from overleaf"
					return callback(err)
					planName = body.plan_name
					if planName
						planName = "ol_"
				return callback(null, planName)

	_overleafPlanRequest: (overleafId, callback=(err, response, body)->) ->
		opts = {
			uri: "#{settings.overleaf.host}/api/v1/sharelatex/users/#{overleafId}/plan"
			method: 'GET'
			json: true
			timeout: 5 * 1000
		}
		if settings.overleaf?.basicAuth?.username
			opts.auth = {
				user: settings.overleaf.basicAuth.username
				pass: settings.overleaf.basicAuth.password
			}
		request opts, callback
