AuthorizationMiddlewear = require "../../../../app/js/Features/Authorization/AuthorizationMiddlewear"
V2TemplatesController = require "./V2TemplatesController"
settings = require "settings-sharelatex"

module.exports = 
	apply: (webRouter) ->
		return unless settings.overleaf

		webRouter.get "/articles", V2TemplatesController.getArticles
		webRouter.get "/articles/:read_token/clone", V2TemplatesController.cloneTemplate
		webRouter.get "/articles/popular", V2TemplatesController.getArticlesPopular
		webRouter.get "/articles/popular/page/:page_num", V2TemplatesController.getArticlesPopular
		webRouter.get "/articles/recent", V2TemplatesController.getArticlesRecent
		webRouter.get "/articles/recent/page/:page_num", V2TemplatesController.getArticlesRecent
		webRouter.get "/articles/tagged/:tag_name", V2TemplatesController.getArticlesTagged
		webRouter.get "/articles/tagged/:tag_name/page/:page_num", V2TemplatesController.getArticlesTagged
		webRouter.get "/articles/:slug/:read_token", V2TemplatesController.getTemplate

		webRouter.get "/gallery", V2TemplatesController.getGallery
		webRouter.get "/gallery/popular", V2TemplatesController.getGalleryPopular
		webRouter.get "/gallery/popular/page/:page_num", V2TemplatesController.getGalleryPopular
		webRouter.get "/gallery/recent", V2TemplatesController.getGalleryRecent
		webRouter.get "/gallery/recent/page/:page_num", V2TemplatesController.getGalleryRecent
		webRouter.get "/gallery/tagged/:tag_name", V2TemplatesController.getGalleryTagged
		webRouter.get "/gallery/tagged/:tag_name/page/:page_num", V2TemplatesController.getGalleryTagged

		webRouter.get "/latex/examples", V2TemplatesController.getExamples
		webRouter.get "/latex/examples/:read_token/clone", V2TemplatesController.cloneTemplate
		webRouter.get "/latex/examples/popular", V2TemplatesController.getExamplesPopular
		webRouter.get "/latex/examples/popular/page/:page_num", V2TemplatesController.getExamplesPopular
		webRouter.get "/latex/examples/recent", V2TemplatesController.getExamplesRecent
		webRouter.get "/latex/examples/recent/page/:page_num", V2TemplatesController.getExamplesRecent
		webRouter.get "/latex/examples/tagged/:tag_name", V2TemplatesController.getExamplesTagged
		webRouter.get "/latex/examples/tagged/:tag_name/page/:page_num", V2TemplatesController.getExamplesTagged
		webRouter.get "/latex/examples/:slug/:read_token", V2TemplatesController.getTemplate

		webRouter.get "/latex/templates", V2TemplatesController.getTemplates
		webRouter.get "/latex/templates/:read_token/clone", V2TemplatesController.cloneTemplate
		webRouter.get "/latex/templates/popular", V2TemplatesController.getTemplatesPopular
		webRouter.get "/latex/templates/popular/page/:page_num", V2TemplatesController.getTemplatesPopular
		webRouter.get "/latex/templates/recent", V2TemplatesController.getTemplatesRecent
		webRouter.get "/latex/templates/recent/page/:page_num", V2TemplatesController.getTemplatesRecent
		webRouter.get "/latex/templates/tagged/:tag_name", V2TemplatesController.getTemplatesTagged
		webRouter.get "/latex/templates/tagged/:tag_name/page/:page_num", V2TemplatesController.getTemplatesTagged
		webRouter.get "/latex/templates/:slug/:read_token", V2TemplatesController.getTemplate
