DropboxUserController = require './DropboxUserController'
DropboxWebhookController = require './DropboxWebhookController'
DropboxProjectController = require "./DropboxProjectController"
DropboxMiddleware = require "./DropboxMiddleware"
AuthorizationMiddleware = require "../../../../app/js/Features/Authorization/AuthorizationMiddleware"
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"
module.exports =
	apply: (webRouter, privateApiRouter, publicApiRouter) ->
		webRouter.get  '/user/settings', DropboxMiddleware.injectUserSettings
		
		webRouter.get  '/dropbox/beginAuth', AuthenticationController.requireLogin(), DropboxUserController.redirectUserToDropboxAuth
		webRouter.get  '/dropbox/completeRegistration', AuthenticationController.requireLogin(), DropboxUserController.completeDropboxRegistrationPage
		webRouter.post  '/dropbox/completeRegistration', AuthenticationController.requireLogin(), DropboxUserController.completeDropboxRegistration
		webRouter.post  '/dropbox/unlink', AuthenticationController.requireLogin(), DropboxUserController.unlinkDropbox
		
		webRouter.get '/dropbox/status', AuthenticationController.requireLogin(), DropboxProjectController.getStatus

		publicApiRouter.get  '/dropbox/webhook', DropboxWebhookController.verify
		publicApiRouter.post '/dropbox/webhook', DropboxWebhookController.webhook
