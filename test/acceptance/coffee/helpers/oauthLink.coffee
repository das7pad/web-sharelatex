Request = require "request"
request = require "../../../../../../test/acceptance/js/helpers/request"

module.exports = (saml_response, user, callback) ->
	options =
		qs:
			client_id: "mock-collabratec-oauth-client-id"
		url: "/collabratec/auth/link"
	user.request options, (error, response, body) ->
		return callback error if error?
		options =
			form:
				SAMLResponse: saml_response
			method: 'post'
			url: '/org/ieee/saml/consume'
		user.request options, (error, response, body) ->
			return callback error if error?
			callback null
