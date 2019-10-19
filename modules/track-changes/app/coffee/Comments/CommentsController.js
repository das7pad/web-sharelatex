/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let CommentsController;
const ChatApiHandler = require("../../../../../app/js/Features/Chat/ChatApiHandler");
const ChatController = require("../../../../../app/js/Features/Chat/ChatController");
const EditorRealTimeController = require("../../../../../app/js/Features/Editor/EditorRealTimeController");
const logger = require("logger-sharelatex");
const AuthenticationController = require('../../../../../app/js/Features/Authentication/AuthenticationController');
const UserInfoManager = require('../../../../../app/js/Features/User/UserInfoManager');
const UserInfoController = require('../../../../../app/js/Features/User/UserInfoController');
const DocumentUpdaterHandler = require("../../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler");
const async = require("async");

module.exports = (CommentsController = {
	sendComment(req, res, next) {
		const {project_id, thread_id} = req.params;
		const {
            content
        } = req.body;
		const user_id = AuthenticationController.getLoggedInUserId(req);
		if ((user_id == null)) {
			const err = new Error('no logged-in user');
			return next(err);
		}
		logger.log({project_id, thread_id, user_id, content}, "sending comment");
		return ChatApiHandler.sendComment(project_id, thread_id, user_id, content, function(err, comment) {
			if (err != null) { return next(err); }
			return UserInfoManager.getPersonalInfo(comment.user_id, function(err, user) {
				if (err != null) { return next(err); }
				comment.user = UserInfoController.formatPersonalInfo(user);
				EditorRealTimeController.emitToRoom(project_id, "new-comment", thread_id, comment, function(err) {});
				return res.sendStatus(204);
			});
		});
	},

	getThreads(req, res, next) {
		const {project_id} = req.params;
		logger.log({project_id}, "getting comment threads for project");
		return ChatApiHandler.getThreads(project_id, function(err, threads) {
			if (err != null) { return next(err); }
			return ChatController._injectUserInfoIntoThreads(threads, function(error, threads) {
				if (err != null) { return next(err); }
				return res.json(threads);
			});
		});
	},

	resolveThread(req, res, next) {
		const {project_id, thread_id} = req.params;
		const user_id = AuthenticationController.getLoggedInUserId(req);
		logger.log({project_id, thread_id, user_id}, "resolving comment thread");
		return ChatApiHandler.resolveThread(project_id, thread_id, user_id, function(err) {
			if (err != null) { return next(err); }
			return UserInfoManager.getPersonalInfo(user_id, function(err, user) {
				if (err != null) { return next(err); }
				EditorRealTimeController.emitToRoom(project_id, "resolve-thread", thread_id, UserInfoController.formatPersonalInfo(user), function(err){});
				return res.sendStatus(204);
			});
		});
	},

	reopenThread(req, res, next) {
		const {project_id, thread_id} = req.params;
		logger.log({project_id, thread_id}, "reopening comment thread");
		return ChatApiHandler.reopenThread(project_id, thread_id, function(err, threads) {
			if (err != null) { return next(err); }
			EditorRealTimeController.emitToRoom(project_id, "reopen-thread", thread_id, function(err){});
			return res.sendStatus(204);
		});
	},
	
	deleteThread(req, res, next) {
		const {project_id, doc_id, thread_id} = req.params;
		logger.log({project_id, doc_id, thread_id}, "deleting comment thread");
		return DocumentUpdaterHandler.deleteThread(project_id, doc_id, thread_id, function(err) {
			if (err != null) { return next(err); }
			return ChatApiHandler.deleteThread(project_id, thread_id, function(err, threads) {
				if (err != null) { return next(err); }
				EditorRealTimeController.emitToRoom(project_id, "delete-thread", thread_id, function(err){});
				return res.sendStatus(204);
			});
		});
	},
	
	editMessage(req, res, next) {
		const {project_id, thread_id, message_id} = req.params;
		const {content} = req.body;
		logger.log({project_id, thread_id, message_id}, "editing message thread");
		return ChatApiHandler.editMessage(project_id, thread_id, message_id, content, function(err) {
			if (err != null) { return next(err); }
			EditorRealTimeController.emitToRoom(project_id, "edit-message", thread_id, message_id, content, function(err){});
			return res.sendStatus(204);
		});
	},
	
	deleteMessage(req, res, next) {
		const {project_id, thread_id, message_id} = req.params;
		logger.log({project_id, thread_id, message_id}, "deleting message");
		return ChatApiHandler.deleteMessage(project_id, thread_id, message_id, function(err, threads) {
			if (err != null) { return next(err); }
			EditorRealTimeController.emitToRoom(project_id, "delete-message", thread_id, message_id, function(err){});
			return res.sendStatus(204);
		});
	}
});
