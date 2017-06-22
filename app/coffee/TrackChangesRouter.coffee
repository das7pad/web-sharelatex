CommentsController = require "./Comments/CommentsController"
TrackChangesController = require "./TrackChanges/TrackChangesController"
AuthorizationMiddlewear = require "../../../../app/js/Features/Authorization/AuthorizationMiddlewear"

module.exports =
	apply: (webRouter, apiRouter) ->
		webRouter.get "/project/:project_id/ranges", AuthorizationMiddlewear.ensureUserCanReadProject, TrackChangesController.getAllRanges
		webRouter.get "/project/:project_id/changes/users", AuthorizationMiddlewear.ensureUserCanReadProject, TrackChangesController.getAllChangesUsers
		webRouter.post "/project/:project_id/doc/:doc_id/changes/:change_id/accept", AuthorizationMiddlewear.ensureUserCanWriteProjectContent, TrackChangesController.acceptChanges
		webRouter.post "/project/:project_id/doc/:doc_id/changes/accept", AuthorizationMiddlewear.ensureUserCanWriteProjectContent, TrackChangesController.acceptChanges
		webRouter.post "/project/:project_id/track_changes", AuthorizationMiddlewear.ensureUserCanWriteProjectContent, TrackChangesController.setTrackChangesState

		# Note: Read only users can still comment
		webRouter.post "/project/:project_id/thread/:thread_id/messages", AuthorizationMiddlewear.ensureUserCanReadProject, CommentsController.sendComment
		webRouter.get  "/project/:project_id/threads", AuthorizationMiddlewear.ensureUserCanReadProject, CommentsController.getThreads
		webRouter.post "/project/:project_id/thread/:thread_id/resolve", AuthorizationMiddlewear.ensureUserCanWriteProjectContent, CommentsController.resolveThread
		webRouter.post "/project/:project_id/thread/:thread_id/reopen", AuthorizationMiddlewear.ensureUserCanWriteProjectContent, CommentsController.reopenThread
		webRouter.delete "/project/:project_id/doc/:doc_id/thread/:thread_id", AuthorizationMiddlewear.ensureUserCanWriteProjectContent, CommentsController.deleteThread
		webRouter.post "/project/:project_id/thread/:thread_id/messages/:message_id/edit", AuthorizationMiddlewear.ensureUserCanWriteProjectContent, CommentsController.editMessage
		webRouter.delete  "/project/:project_id/thread/:thread_id/messages/:message_id", AuthorizationMiddlewear.ensureUserCanWriteProjectContent, CommentsController.deleteMessage
