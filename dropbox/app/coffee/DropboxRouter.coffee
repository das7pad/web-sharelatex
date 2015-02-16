DropboxUserController = require './DropboxUserController'
DropboxWebhookController = require './DropboxWebhookController'
DropboxProjectController = require "./DropboxProjectController"
DropboxMiddlewear = require "./DropboxMiddlewear"
SecurityManager = require "../../../../app/js/managers/SecurityManager"

module.exports =
	apply: (app) ->
		app.get  '/user/settings', DropboxMiddlewear.injectUserSettings
		
		app.get  '/dropbox/beginAuth', DropboxUserController.redirectUserToDropboxAuth
		app.get  '/dropbox/completeRegistration', DropboxUserController.completeDropboxRegistration
		app.get  '/dropbox/unlink', DropboxUserController.unlinkDropbox
		
		app.get  '/dropbox/webhook', DropboxWebhookController.verify
		app.post '/dropbox/webhook', DropboxWebhookController.webhook
		app.ignoreCsrf('post', '/dropbox/webhook')

		app.get '/project/:Project_id/dropbox/status', SecurityManager.requestIsOwner, DropboxProjectController.getStatus


