DropboxUserController = require './DropboxUserController'
DropboxWebhookController = require './DropboxWebhookController'
DropboxProjectController = require "./DropboxProjectController"
DropboxMiddlewear = require "./DropboxMiddlewear"
AuthorizationMiddlewear = require "../../../../app/js/Features/Authorization/AuthorizationMiddlewear"

module.exports =
	apply: (webRouter, apiRouter) ->
		webRouter.get  '/user/settings', DropboxMiddlewear.injectUserSettings
		
		webRouter.get  '/dropbox/beginAuth', DropboxUserController.redirectUserToDropboxAuth
		webRouter.get  '/dropbox/completeRegistration', DropboxUserController.completeDropboxRegistration
		webRouter.get  '/dropbox/unlink', DropboxUserController.unlinkDropbox
		
		apiRouter.get  '/dropbox/webhook', DropboxWebhookController.verify
		apiRouter.post '/dropbox/webhook', DropboxWebhookController.webhook

		webRouter.get '/project/:Project_id/dropbox/status', AuthorizationMiddlewear.ensureUserCanAdminProject, DropboxProjectController.getStatus


