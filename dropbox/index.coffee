DropboxRouter = require "./app/js/DropboxRouter"
DropboxHandler = require "./app/js/DropboxHandler"
Events = require "../../app/js/infrastructure/Events"
logger = require "logger-sharelatex"

module.exports = DropboxSync =	
	router: DropboxRouter

	viewIncludes:
		"userSettings" : "user/_settings"
		"editorLeftMenu:sync" : "project/editor/_left-menu"

	init: () ->
		Events.on "cancelSubscription", (user_id) ->
			DropboxHandler.unlinkAccount user_id, (error) ->
				if error?
					logger.err {err: error, user_id}, "error unlinking dropbox"