Csrf = require("../../../../app/js/infrastructure/Csrf")
Path = require("path")
querystring = require('querystring')
AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController")

# middleware to accept an external request and redirect to it via a gateway that adds a csrf token. Will also
# redirect via the login page if the user is not authenticated.

module.exports = OpenInOverleafMiddleware =
	middleware: (req, res, next)->
		if !AuthenticationController.isUserLoggedIn(req)
			AuthenticationController.setRedirectInSession(req)
			return OpenInOverleafMiddleware._renderGateway(req, 'store', "/login?", res)

		Csrf.validateRequest req, (csrf_valid) ->
			if req.method == 'POST' && csrf_valid
				return next()

			OpenInOverleafMiddleware._renderGateway(req, 'submit', null, res)

	_renderGateway: (req, action, target, res) ->
		# action should be:
		# - submit, render the gateway page to resubmit with a csrf token
		# - store, render the gateway page to copy the params to local storage and redirect to the target url
		res.render Path.resolve(__dirname, '../views/gateway'), form_data: (if req.method == 'GET' then req.query else req.body), action: action, target: target
