Path = require "path"
V2TemplatesManager = require "./V2TemplatesManager"

module.exports = V2TemplatesController =

	getArticles: (req, res, next) ->
		V2TemplatesController.getPage req, res, next, 'article'

	getArticlesPopular: (req, res, next) ->
		V2TemplatesController.getPagePaginated req, res, next, 'article', 'popular'

	getArticlesRecent: (req, res, next) ->
		V2TemplatesController.getPagePaginated req, res, next, 'article', 'recent'

	getArticlesTagged: (req, res, next) ->
		V2TemplatesController.getPageTagged req, res, next, 'article'

	getExamples: (req, res, next) ->
		V2TemplatesController.getPage req, res, next, 'example'

	getExamplesPopular: (req, res, next) ->
		V2TemplatesController.getPagePaginated req, res, next, 'example', 'popular'

	getExamplesRecent: (req, res, next) ->
		V2TemplatesController.getPagePaginated req, res, next, 'example', 'recent'

	getExamplesTagged: (req, res, next) ->
		V2TemplatesController.getPageTagged req, res, next, 'example'

	getGallery: (req, res, next) ->
		V2TemplatesController.getPage req, res, next, 'gallery'

	getGalleryPopular: (req, res, next) ->
		V2TemplatesController.getPagePaginated req, res, next, 'gallery', 'popular'

	getGalleryRecent: (req, res, next) ->
		V2TemplatesController.getPagePaginated req, res, next, 'gallery', 'recent'

	getGalleryTagged: (req, res, next) ->
		V2TemplatesController.getPageTagged req, res, next, 'gallery'

	getPage: (req, res, next, content_type_name) ->
		V2TemplatesManager.getPage content_type_name, (err, page) ->
			return next(err) if err
			res.render(Path.resolve(__dirname, "../views/index"), page)

	getPagePaginated: (req, res, next, content_type_name, segment) ->
		if req.params.page_num > 1
			page_num = req.params.page_num
		else
			page_num = 1
		V2TemplatesManager.getPagePaginated content_type_name, segment, page_num, (err, page) ->
			return next(err) if err
			res.render(Path.resolve(__dirname, "../views/index"), page)

	getPageTagged: (req, res, next, content_type_name) ->
		if req.params.page_num > 1
			page_num = req.params.page_num
		else
			page_num = 1
		V2TemplatesManager.getPageTagged content_type_name, req.params.tag_name, page_num, (err, page) ->
			return next err if err
			res.render Path.resolve(__dirname, "../views/index_tagged"), page

	getTemplate: (req, res, next) ->
		V2TemplatesManager.getTemplate req.params.slug, req.params.read_token, (err, page) ->
			return next err if err
			res.render Path.resolve(__dirname, "../views/template"), page

	getTemplates: (req, res, next) ->
		V2TemplatesController.getPage req, res, next, 'template'

	getTemplatesPopular: (req, res, next) ->
		V2TemplatesController.getPagePaginated req, res, next, 'template', 'popular', req.params.page_num

	getTemplatesRecent: (req, res, next) ->
		V2TemplatesController.getPagePaginated req, res, next, 'template', 'recent', req.params.page_num

	getTemplatesTagged: (req, res, next) ->
		V2TemplatesController.getPageTagged req, res, next, 'template'
