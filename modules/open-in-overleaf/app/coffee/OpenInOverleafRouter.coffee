OpenInOverleafController = require("./OpenInOverleafController")
OpenInOverleafMiddleware = require("./OpenInOverleafMiddleware")
Csrf = require("../../../../app/js/infrastructure/Csrf")

module.exports =
	apply: (webRouter) ->
		webRouter.csrf.disableDefaultCsrfProtection('/docs', 'POST')
		webRouter.get  '/docs', OpenInOverleafMiddleware.middleware, OpenInOverleafController.openInOverleaf
		webRouter.post '/docs', OpenInOverleafMiddleware.middleware, OpenInOverleafController.openInOverleaf
