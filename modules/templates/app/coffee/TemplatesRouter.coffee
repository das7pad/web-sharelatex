AuthorizationMiddleware = require "../../../../app/js/Features/Authorization/AuthorizationMiddleware"
AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController")
TemplatesWebController = require("./TemplatesWebController")
TemplatesController = require("./TemplatesController")
TemplatesMiddleware = require('./TemplatesMiddleware')
middleWare = require("./TemplatesMiddleware")
Features = require "../../../../app/js/infrastructure/Features"

module.exports = 
	apply: (app)->
		if Features.hasFeature('view-templates')
			app.get "/templates", middleWare.insert_templates_user_id, TemplatesWebController.renderTemplatesIndexPage
			app.get "/templates/user/:user_id", TemplatesWebController.renderTemplatesIndexPage

			app.get "/templates/:tag_or_template_id", middleWare.id_or_tag_parse, middleWare.insert_templates_user_id, TemplatesWebController.tagOrCanonicalPage
			app.get "/templates/user/:user_id/:tag_or_template_id", middleWare.id_or_tag_parse, TemplatesWebController.tagOrCanonicalPage

			app.get "/templates/:tag_name/:template_name", middleWare.insert_templates_user_id, TemplatesWebController.renerTemplateInTag
			app.get "/templates/user/:user_id/:tag_name/:template_name", TemplatesWebController.renerTemplateInTag

			app.get "/templates/:template_id/v/:version/:file_type", TemplatesWebController.proxyToTemplatesApi
			app.get "/templates/:template_id/v/:version/:file_type/:preview_type", TemplatesWebController.proxyToTemplatesApi

		# Make sure the /project/new/template route comes before the /project/:project_id/template route
		# This is a get request so that it can be linked to.
		app.get '/project/new/template', TemplatesMiddleware.saveTemplateDataInSession, AuthenticationController.requireLogin(), TemplatesController.createProjectFromZipTemplate

		if Features.hasFeature('publish-templates')
			app.get  "/project/:Project_id/template", AuthorizationMiddleware.ensureUserCanReadProject, TemplatesController.getTemplateDetails
			app.post "/project/:Project_id/template/publish", AuthorizationMiddleware.ensureUserCanAdminProject, TemplatesController.publishProject
			app.post "/project/:Project_id/template/unpublish", AuthorizationMiddleware.ensureUserCanAdminProject, TemplatesController.unpublishProject
			app.post "/project/:Project_id/template/description", AuthorizationMiddleware.ensureUserCanWriteProjectContent, TemplatesController.updateProjectDescription
