logger = require 'logger-sharelatex'
AboutController = require './controllers/AboutController'
BlogController = require './controllers/BlogController'
ContactContoller = require './controllers/ContactController'
LegalController = require './controllers/LegalController'
GeneralController = require './controllers/GeneralController'
ErrorController = require '../../../../app/js/Features/Errors/ErrorController'

removeRoute = (webRouter, method, path) ->
	index = null
	for route, i in webRouter.stack
		if route?.route?.path == path
			index = i
	if index?
		logger.log method:method, path:path, index:index, 'removing route from express router'
		webRouter.stack.splice(index,1)

send404 = (req, res) ->
	ErrorController.notFound req, res

cmsPathOptions = 'about|for'

module.exports =
	apply: (webRouter) ->
		removeRoute webRouter, 'get', '/about'
		removeRoute webRouter, 'get', '/blog'
		removeRoute webRouter, 'get', '/blog/*'
		webRouter.get '/about', AboutController.getPage
		webRouter.get '/blog', BlogController.getBlog
		webRouter.get '/contact', ContactContoller.getContactPage
		webRouter.get '/legal', LegalController.getLegal
		webRouter.get '/blog/page', BlogController.redirectToList
		webRouter.get '/blog/page/:page', BlogController.getBlog
		webRouter.get '/blog/tagged', BlogController.redirectToList
		webRouter.get '/blog/tagged/:tag', BlogController.getBlog
		webRouter.get '/blog/tagged/:tag/page/:page', BlogController.getBlog
		webRouter.get '/blog/feed', BlogController.getFeed
		webRouter.get '/blog/:slug', BlogController.getBlogPost
		webRouter.get "/:path(#{cmsPathOptions})/:parent_slug/:slug", GeneralController.getPage
		webRouter.get "/:path(#{cmsPathOptions})/:slug", GeneralController.getPage
