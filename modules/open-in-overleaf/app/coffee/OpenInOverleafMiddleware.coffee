Csrf = require("../../../../app/js/infrastructure/Csrf")
Path = require("path")
AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController")

# middleware to accept an external request and redirect to it via a gateway that adds a csrf token. Will also
# redirect via the login page if the user is not authenticated.

module.exports = OpenInOverleafMiddleware =
	middleware: (req, res, next)->
		OpenInOverleafMiddleware._setupRequest req, res, (error)->
			next(error) if error
			AuthenticationController.requireLogin() req, res, (error)->
				next(error) if error
				OpenInOverleafMiddleware._handleCsrfGateway req, res, (error)->
					next(error) if error
					OpenInOverleafMiddleware._finalizeRequest req, res, next


	_handleCsrfGateway: (req, res, next) ->
		# check that the csrf is valid
		# a missing csrf token will indicate that the request is external and it will have been stashed
		Csrf.validateRequest req, (csrf_valid) ->
			# render the gateway page, if there is no valid csrf token
			return res.render Path.resolve(__dirname, '../views/gateway') unless csrf_valid && req.method == 'POST'

			# otherwise, continue
			next()

	_setupRequest: (req, res, next) ->
		params = {}
		# stash the request if present, or quit if nothing is stashed and there is no request
		params = req.query if req.method == 'GET'
		params = req.body if req.method == 'POST'
		if OpenInOverleafMiddleware._paramsHaveKeysOtherThanCsrfToken(params)
			req.session.stashedApiRequest = params

		if req.session.stashedApiRequest?
			next()
		else
			res.redirect("/")

	_finalizeRequest: (req, res, next) ->
		# unstash the stashed request
		req.session.stashedApiRequest._csrf = req.body._csrf
		req.body = req.session.stashedApiRequest
		delete req.session.stashedApiRequest
		next()

	_paramsHaveKeysOtherThanCsrfToken: (params) ->
		if params
			len = Object.keys(params).length
			len -= 1 if params._csrf
			return len > 0
		return false
