ChatApiHandler = require("../../../../../app/js/Features/Chat/ChatApiHandler")
ChatController = require("../../../../../app/js/Features/Chat/ChatController")
EditorRealTimeController = require("../../../../../app/js/Features/Editor/EditorRealTimeController")
logger = require("logger-sharelatex")
AuthenticationController = require('../../../../../app/js/Features/Authentication/AuthenticationController')
UserInfoManager = require('../../../../../app/js/Features/User/UserInfoManager')
UserInfoController = require('../../../../../app/js/Features/User/UserInfoController')
DocumentUpdaterHandler = require "../../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler"
async = require "async"

module.exports = CommentsController =
	sendComment: (req, res, next) ->
		{project_id, thread_id} = req.params
		content = req.body.content
		user_id = AuthenticationController.getLoggedInUserId(req)
		if !user_id?
			err = new Error('no logged-in user')
			return next(err)
		logger.log {project_id, thread_id, user_id, content}, "sending comment"
		ChatApiHandler.sendComment project_id, thread_id, user_id, content, (err, comment) ->
			return next(err) if err?
			UserInfoManager.getPersonalInfo comment.user_id, (err, user) ->
				return next(err) if err?
				comment.user = UserInfoController.formatPersonalInfo(user)
				EditorRealTimeController.emitToRoom project_id, "new-comment", thread_id, comment, (err) ->
				res.send 204

	getThreads: (req, res, next) ->
		{project_id} = req.params
		logger.log {project_id}, "getting comment threads for project"
		ChatApiHandler.getThreads project_id, (err, threads) ->
			return next(err) if err?
			ChatController._injectUserInfoIntoThreads threads, (error, threads) ->
				return next(err) if err?
				res.json threads

	resolveThread: (req, res, next) ->
		{project_id, thread_id} = req.params
		user_id = AuthenticationController.getLoggedInUserId(req)
		logger.log {project_id, thread_id, user_id}, "resolving comment thread"
		ChatApiHandler.resolveThread project_id, thread_id, user_id, (err) ->
			return next(err) if err?
			UserInfoManager.getPersonalInfo user_id, (err, user) ->
				return next(err) if err?
				EditorRealTimeController.emitToRoom project_id, "resolve-thread", thread_id, UserInfoController.formatPersonalInfo(user), (err)->
				res.send 204

	reopenThread: (req, res, next) ->
		{project_id, thread_id} = req.params
		logger.log {project_id, thread_id}, "reopening comment thread"
		ChatApiHandler.reopenThread project_id, thread_id, (err, threads) ->
			return next(err) if err?
			EditorRealTimeController.emitToRoom project_id, "reopen-thread", thread_id, (err)->
			res.send 204
	
	deleteThread: (req, res, next) ->
		{project_id, doc_id, thread_id} = req.params
		logger.log {project_id, doc_id, thread_id}, "deleting comment thread"
		DocumentUpdaterHandler.deleteThread project_id, doc_id, thread_id, (err) ->
			return next(err) if err?
			ChatApiHandler.deleteThread project_id, thread_id, (err, threads) ->
				return next(err) if err?
				EditorRealTimeController.emitToRoom project_id, "delete-thread", thread_id, (err)->
				res.send 204
	
	editMessage: (req, res, next) ->
		{project_id, thread_id, message_id} = req.params
		{content} = req.body
		logger.log {project_id, thread_id, message_id}, "editing message thread"
		ChatApiHandler.editMessage project_id, thread_id, message_id, content, (err) ->
			return next(err) if err?
			EditorRealTimeController.emitToRoom project_id, "edit-message", thread_id, message_id, content, (err)->
			res.send 204
	
	deleteMessage: (req, res, next) ->
		{project_id, thread_id, message_id} = req.params
		logger.log {project_id, thread_id, message_id}, "deleting message"
		ChatApiHandler.deleteMessage project_id, thread_id, message_id, (err, threads) ->
			return next(err) if err?
			EditorRealTimeController.emitToRoom project_id, "delete-message", thread_id, message_id, (err)->
			res.send 204
