RateLimiterMiddlewear = require("../../../../app/js/Features/Security/RateLimiterMiddlewear.js")
WikiController = require("./WikiController")
settings = require("settings-sharelatex")
logger = require('logger-sharelatex')
_ = require('lodash')


module.exports =
	apply: (webRouter, apiRouter) ->

		if settings.apis.wiki?.url? or settings.proxyLearn
			#used for images onsite installs
			webRouter.get /^\/learn-scripts\/images/, RateLimiterMiddlewear.rateLimit({
				endpointName: "wiki"
				params: []
				maxRequests: 60
				timeInterval: 60
			}), WikiController.proxy

			# Match either /learn on its own, or /learn/Page_name/...
			webRouter.get /^\/learn(\/.*)?$/, RateLimiterMiddlewear.rateLimit({
				endpointName: "wiki"
				params: []
				maxRequests: 60
				timeInterval: 60
			}), WikiController.getPage

			# Check if a `/learn` link exists in header_extras, either under the `Help` menu
			# or on it's own. If not, add it, either on it's own or in the `Help` menu,
			# whichever is most appropriate.
			_getHelp = (someList) ->
				_.find(someList, ((e)-> e?.text?.toLowerCase?() == 'help' && e.dropdown?))
			_getLearn = (someList) ->
				_.find(someList, ((element)-> element.url == '/learn'))
			_addLearn = (targetList, optionalClass) ->
				targetList.unshift({url: '/learn', text: 'documentation', class: optionalClass})
			webRouter.use (req, res, next) ->
				try
					if res.locals?.nav?.header_extras?
						header_extras = res.locals.nav.header_extras
						if help = _getHelp(header_extras)
							if !_getLearn(help.dropdown)
								_addLearn(help.dropdown)
						else
							if !_getLearn(header_extras)
								_addLearn(header_extras, 'subdued')
				catch e
					logger.error {error: e.message}, "could not automatically add `/learn` link to header"
				next()
