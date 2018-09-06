AuthorizationMiddlewear = require "../../../../app/js/Features/Authorization/AuthorizationMiddlewear"
AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController")
TemplatesWebController = require("./TemplatesWebController")
TemplatesController = require("./TemplatesController")
TemplatesMiddlewear = require('./TemplatesMiddlewear')
middleWear = require("./TemplatesMiddlewear")
Features = require "../../../../app/js/infrastructure/Features"

module.exports = 
	apply: (app)->
		if Features.hasFeature('view-templates')
			app.get "/templates", middleWear.insert_templates_user_id, TemplatesWebController.renderTemplatesIndexPage
			app.get "/templates/user/:user_id", TemplatesWebController.renderTemplatesIndexPage

			app.get "/templates/:tag_or_template_id", middleWear.id_or_tag_parse, middleWear.insert_templates_user_id, TemplatesWebController.tagOrCanonicalPage
			app.get "/templates/user/:user_id/:tag_or_template_id", middleWear.id_or_tag_parse, TemplatesWebController.tagOrCanonicalPage

			app.get "/templates/:tag_name/:template_name", middleWear.insert_templates_user_id, TemplatesWebController.renerTemplateInTag
			app.get "/templates/user/:user_id/:tag_name/:template_name", TemplatesWebController.renerTemplateInTag

			app.get "/templates/:template_id/v/:version/:file_type", TemplatesWebController.proxyToTemplatesApi
			app.get "/templates/:template_id/v/:version/:file_type/:preview_type", TemplatesWebController.proxyToTemplatesApi

		# Make sure the /project/new/template route comes before the /project/:project_id/template route
		# This is a get request so that it can be linked to.
		app.get '/project/new/template', TemplatesMiddlewear.saveTemplateDataInSession, AuthenticationController.requireLogin(), TemplatesController.createProjectFromZipTemplate

		if Features.hasFeature('publish-templates')
			app.get  "/project/:Project_id/template", AuthorizationMiddlewear.ensureUserCanReadProject, TemplatesController.getTemplateDetails
			app.post "/project/:Project_id/template/publish", AuthorizationMiddlewear.ensureUserCanAdminProject, TemplatesController.publishProject
			app.post "/project/:Project_id/template/unpublish", AuthorizationMiddlewear.ensureUserCanAdminProject, TemplatesController.unpublishProject
			app.post "/project/:Project_id/template/description", AuthorizationMiddlewear.ensureUserCanWriteProjectContent, TemplatesController.updateProjectDescription
