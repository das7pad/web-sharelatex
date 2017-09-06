dropboxHandler = require('./DropboxHandler')
AuthenticationController = require('../../../../app/js/Features/Authentication/AuthenticationController')
logger = require('logger-sharelatex')
path = require("path")
qs = require("querystring")

module.exports =

	redirectUserToDropboxAuth: (req, res, next)->
		user_id = AuthenticationController.getLoggedInUserId(req)
		dropboxHandler.getDropboxRegisterUrl user_id, (err, url)->
			return next(err) if err?
			logger.log url:url, "redirecting user for dropbox auth"
			res.redirect url

	completeDropboxRegistrationPage: (req, res, next)->
		viewPath = path.join(__dirname, "../views/user/completeRegistration")
		res.render viewPath

	completeDropboxRegistration: (req, res, next)->
		{access_token, token_type, uid} = qs.parse(req.body.tokenInfo)
		token =
			token_type:token_type.trim().slice(0,32)
			access_token:access_token.trim().slice(0,64)
		user_id = AuthenticationController.getLoggedInUserId(req)
		dropboxHandler.setAccessToken user_id, token, uid, (err)->
			if err?
				res.sendStatus 500
			else
				res.sendStatus 200

	unlinkDropbox: (req, res, next)->
		user_id = AuthenticationController.getLoggedInUserId(req)
		dropboxHandler.unlinkAccount user_id, (err, success)->
			return next(err) if err?
			res.redirect('/user/settings#dropboxSettings')
