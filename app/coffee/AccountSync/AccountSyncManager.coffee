UserGetter = require('../../../../../app/js/Features/User/UserGetter')
Settings = require('settings-sharelatex')
request = require('request')
logger = require('logger-sharelatex')

# TODO: set the actual features
PlanFeatures = {
	'default': Settings.defaultFeatures,
	pro: {
		collaborators: 10
		dropbox: true
		versioning: true
		compileTimeout: 200
		compileGroup: "standard"
		references: true
		templates: true
		trackChanges: true
	},
	pro_plus: {
		collaborators: 20
		dropbox: true
		versioning: true
		compileTimeout: 500
		compileGroup: "priority"
		references: true
		templates: true
		trackChanges: true
	}
}


module.exports = AccountSyncManager =

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
				return callback(null, body.plan_name)


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

	# planName = 'pro' | 'pro_plus' | null
	getFeaturesForPlanName: (planName, callback=(err, features)->) ->
		if !planName
			planName = 'default'
		features = PlanFeatures[planName] || null
		return callback(null, features)

