settings = require 'settings-sharelatex'
request = require 'request'
UserGetter = require '../../../../app/js/Features/User/UserGetter'
logger = require 'logger-sharelatex'

module.exports = MetricsController =

	metricsSegmentation: (req, res, next) ->
		userId = req.params.user_id
		if !userId?
			return next(new Error('[V1Segmentation] user_id required'))
		UserGetter.getUser userId, {overleaf: 1}, (err, user) ->
			return next(err) if err?
			v1_userId = user?.overleaf?.id
			if !v1_userId?
				return res.sendStatus(404)
			request {
				method: 'GET',
				url: settings.apis.v1.url +
					"/api/v1/sharelatex/users/#{v1_userId}/metrics_segmentation",
				auth:
					user: settings.apis.v1.user
					pass: settings.apis.v1.pass
				json: true,
				timeout: 5 * 1000
			}, (err, response, body) ->
				if err?
					return next(err)
				statusCode = response.statusCode
				if statusCode >= 200 and statusCode < 300
					res.json body
				else
					err = new Error(
						"[V1Segmentation] got non-200 response from v1: #{statusCode}"
					)
					logger.err {err, userId}, err.message
					next(err)

