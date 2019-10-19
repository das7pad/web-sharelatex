RateLimiterMiddleware = require("../../../../app/js/Features/Security/RateLimiterMiddleware")
WikiController = require("./WikiController")
settings = require("settings-sharelatex")
logger = require('logger-sharelatex')
_ = require('lodash')
Url = require "url"


module.exports =
	apply: (webRouter, apiRouter) ->

		if settings.apis.wiki?.url? or settings.proxyLearn
			#used for images onsite installs
			webRouter.get /^\/learn-scripts\/images/, RateLimiterMiddleware.rateLimit({
				endpointName: "wiki"
				params: []
				maxRequests: 60
				timeInterval: 60
			}), WikiController.proxy

			# wiki root, `/learn`
			webRouter.get /^\/learn\/?$/i, RateLimiterMiddleware.rateLimit({
				endpointName: "wiki"
				params: []
				maxRequests: 60
				timeInterval: 60
			}), WikiController.getPage

			# redirect `/learn/latex` to wiki root, `/learn`
			webRouter.get /^\/learn\/latex\/?$/i, (req, res) -> 
				res.redirect '/learn'
			
			# redirect `/learn/Kb/Knowledge_Base` or `/learn/how-to/Knowledge_Base`
			# to `/learn/how-to`
			webRouter.get /^\/learn\/(Kb|how-to)\/Knowledge_Base\/?$/i,(req, res) -> 
				res.redirect '/learn/how-to'

			# Knowledge Base redirect
			# ------------------
			# redirect `/learn/kb` to `/learn/how-to`
			# these are still under kb on the wiki,
			# the controller is set up to query for correct page.
			webRouter.get /^\/learn\/kb(\/.*)?$/i, (req, res) ->
				res.redirect(Url.format({
					pathname: req.path.replace(/learn\/kb/i, 'learn/how-to').replace(/%20/g, '_').replace(/\/Knowledge Base/i, ''),
					query: req.query,
				}))

			# Match either /learn/latex/:page or /learn/how-to/:page
			webRouter.get /^\/learn\/(latex|how-to)(\/.*)?$/i, RateLimiterMiddleware.rateLimit({
				endpointName: "wiki"
				params: []
				maxRequests: 60
				timeInterval: 60
			}), WikiController.getPage

			# redirect `/learn/:page` to `/learn/latex/:page`
			webRouter.get /^\/learn(?!\/(latex\/))(.*)?$/i, (req, res) ->
				res.redirect req.url.replace(/^\/learn/i, '/learn/latex').replace(/\?$/, '%3F')

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
