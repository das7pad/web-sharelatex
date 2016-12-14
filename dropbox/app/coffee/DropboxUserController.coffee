dropboxHandler = require('./DropboxHandler')
AuthenticationController = require('../../../../app/js/Features/Authentication/AuthenticationController')
logger = require('logger-sharelatex')


module.exports =

	redirectUserToDropboxAuth: (req, res, next)->
		user_id = AuthenticationController.getLoggedInUserId(req)
		dropboxHandler.getDropboxRegisterUrl user_id, (err, url)->
			return next(err) if err?
			logger.log url:url, "redirecting user for dropbox auth"
			res.redirect url

	completeDropboxRegistration: (req, res, next)->
		user_id = AuthenticationController.getLoggedInUserId(req)
		dropboxHandler.completeRegistration user_id, (err, success)->
			return next(err) if err?
			res.redirect('/user/settings#dropboxSettings')

	unlinkDropbox: (req, res, next)->
		user_id = AuthenticationController.getLoggedInUserId(req)
		dropboxHandler.unlinkAccount user_id, (err, success)->
			return next(err) if err?
			res.redirect('/user/settings#dropboxSettings')
