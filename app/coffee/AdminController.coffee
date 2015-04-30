logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")
User = require("../../../../app/js/models/User").User


module.exports = PublicRegistrationController =
	renderAdminPanel : (req, res, next) ->


		res.render Path.resolve(__dirname, "../views/admin"),
			title: 'Admin Panel'

	listUsers: (req, res, next)->
		logger.log "getting request for list if users"
		User.find {}, 'first_name email lastLoggedIn', (err, users)->
			if err?
				logger.err err:err, "error getting data for users list page"
				return next(err)

			res.render Path.resolve(__dirname, "../views/listUsers"), users:users
