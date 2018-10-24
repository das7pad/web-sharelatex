DropboxHandler = require "./DropboxHandler"
AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController")

module.exports = DropboxProjectController =

	getStatus: (req, res, next) ->
		user_id = AuthenticationController.getLoggedInUserId(req)
		DropboxHandler.getUserRegistrationStatus user_id, (error, status) ->
			return next(error) if error?
			res.json status