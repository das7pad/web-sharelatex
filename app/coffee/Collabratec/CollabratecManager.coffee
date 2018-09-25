url = require "url"
_ = require "lodash"
logger = require 'logger-sharelatex'
{request} = require '../V1SharelatexApi'
settings = require "settings-sharelatex"

samlParams =
	MemberNumber: "IEEE member number"
	Email: "IEEE email address"
	FirstName: "first name"
	LastName: "last name"

module.exports = CollabratecManager =

	clearSession: (session) ->
		delete session.collabratec_oauth_params
		delete session.collabratec_saml_user

	getV1UserByCollabratecId: (collabratec_id, callback) ->
		logger.log { collabratec_id }, "CollabratecManager getV1UserByCollabratecId"
		request {
			expectedStatusCodes: [404]
			qs: { collabratec_id }
			url: "#{settings.v1Api.host}/api/v1/sharelatex/user_collabratec_id"
		}, (err, response, body) ->
			logger.log { err, body }, "CollabratecManager getV1UserByCollabratecId Response"
			return callback err if err?
			return callback null, null if response.statusCode == 404
			return callback null, body

	setV1UserCollabratecId: (user_id, collabratec_id, callback) ->
		logger.log {user_id, collabratec_id},  "CollabratecManager setV1UserCollabratecId"
		request {
			form: { collabratec_id, user_id }
			method: "POST"
			url: "#{settings.v1Api.host}/api/v1/sharelatex/user_collabratec_id"
		}, (err, response, body) ->
			logger.log { err, body },  "CollabratecManager setV1UserCollabratecId Response"
			return callback err if err?
			callback null, body

	oauthRedirectUrl: (oauth_params) ->
		return url.format
			pathname: "/oauth/authorize"
			query: oauth_params

	validateOauthParams: (params={}, callback) ->
		return callback new Error "invalid client_id" unless params.client_id == settings.collabratec.oauth.client_id
		callback null, params

	validateSamlData: (data={}, callback) ->
		for param, name of samlParams
			return callback new Error "identity provider did not provide #{name}" unless data[param]?
		callback null, _.pick(data, _.keys samlParams)
