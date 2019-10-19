CommentsController = require "./Comments/CommentsController"
TrackChangesController = require "./TrackChanges/TrackChangesController"
AuthorizationMiddleware = require "../../../../app/js/Features/Authorization/AuthorizationMiddleware"

module.exports =
	apply: (webRouter, apiRouter) ->
		webRouter.get "/project/:project_id/ranges", AuthorizationMiddleware.ensureUserCanReadProject, TrackChangesController.getAllRanges
		webRouter.get "/project/:project_id/changes/users", AuthorizationMiddleware.ensureUserCanReadProject, TrackChangesController.getAllChangesUsers
		webRouter.post "/project/:project_id/doc/:doc_id/changes/:change_id/accept", AuthorizationMiddleware.ensureUserCanWriteProjectContent, TrackChangesController.acceptChanges
		webRouter.post "/project/:project_id/doc/:doc_id/changes/accept", AuthorizationMiddleware.ensureUserCanWriteProjectContent, TrackChangesController.acceptChanges
		webRouter.post "/project/:project_id/track_changes", AuthorizationMiddleware.ensureUserCanWriteProjectContent, TrackChangesController.setTrackChangesState

		# Note: Read only users can still comment
		webRouter.post "/project/:project_id/thread/:thread_id/messages", AuthorizationMiddleware.ensureUserCanReadProject, CommentsController.sendComment
		webRouter.get  "/project/:project_id/threads", AuthorizationMiddleware.ensureUserCanReadProject, CommentsController.getThreads
		webRouter.post "/project/:project_id/thread/:thread_id/resolve", AuthorizationMiddleware.ensureUserCanWriteProjectContent, CommentsController.resolveThread
		webRouter.post "/project/:project_id/thread/:thread_id/reopen", AuthorizationMiddleware.ensureUserCanWriteProjectContent, CommentsController.reopenThread
		webRouter.delete "/project/:project_id/doc/:doc_id/thread/:thread_id", AuthorizationMiddleware.ensureUserCanWriteProjectContent, CommentsController.deleteThread
		webRouter.post "/project/:project_id/thread/:thread_id/messages/:message_id/edit", AuthorizationMiddleware.ensureUserCanWriteProjectContent, CommentsController.editMessage
		webRouter.delete  "/project/:project_id/thread/:thread_id/messages/:message_id", AuthorizationMiddleware.ensureUserCanWriteProjectContent, CommentsController.deleteMessage
