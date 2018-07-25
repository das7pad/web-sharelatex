AuthorizationMiddlewear = require "../../../../app/js/Features/Authorization/AuthorizationMiddlewear"
V2TemplatesController = require "./V2TemplatesController"
settings = require "settings-sharelatex"

module.exports = 
	apply: (webRouter) ->
		return unless settings.overleaf

		webRouter.get "/articles", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getArticles
		webRouter.get "/articles/popular", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getArticlesPopular
		webRouter.get "/articles/popular/page/:page_num", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getArticlesPopular
		webRouter.get "/articles/recent", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getArticlesRecent
		webRouter.get "/articles/recent/page/:page_num", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getArticlesRecent
		webRouter.get "/articles/tagged/:tag_name", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getArticlesTagged
		webRouter.get "/articles/tagged/:tag_name/page/:page_num", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getArticlesTagged
		webRouter.get "/articles/:slug/:read_token", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getTemplate
		webRouter.get "/gallery", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getGallery
		webRouter.get "/gallery/popular", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getGalleryPopular
		webRouter.get "/gallery/popular/page/:page_num", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getGalleryPopular
		webRouter.get "/gallery/recent", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getGalleryRecent
		webRouter.get "/gallery/recent/page/:page_num", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getGalleryRecent
		webRouter.get "/gallery/tagged/:tag_name", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getGalleryTagged
		webRouter.get "/gallery/tagged/:tag_name/page/:page_num", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getGalleryTagged
		webRouter.get "/latex/examples", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getExamples
		webRouter.get "/latex/examples/popular", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getExamplesPopular
		webRouter.get "/latex/examples/popular/page/:page_num", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getExamplesPopular
		webRouter.get "/latex/examples/recent", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getExamplesRecent
		webRouter.get "/latex/examples/recent/page/:page_num", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getExamplesRecent
		webRouter.get "/latex/examples/tagged/:tag_name", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getExamplesTagged
		webRouter.get "/latex/examples/tagged/:tag_name/page/:page_num", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getExamplesTagged
		webRouter.get "/latex/examples/:slug/:read_token", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getTemplate
		webRouter.get "/latex/templates", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getTemplates
		webRouter.get "/latex/templates/popular", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getTemplatesPopular
		webRouter.get "/latex/templates/popular/page/:page_num", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getTemplatesPopular
		webRouter.get "/latex/templates/recent", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getTemplatesRecent
		webRouter.get "/latex/templates/recent/page/:page_num", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getTemplatesRecent
		webRouter.get "/latex/templates/tagged/:tag_name", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getTemplatesTagged
		webRouter.get "/latex/templates/tagged/:tag_name/page/:page_num", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getTemplatesTagged
		webRouter.get "/latex/templates/:slug/:read_token", AuthorizationMiddlewear.ensureUserIsSiteAdmin, V2TemplatesController.getTemplate
