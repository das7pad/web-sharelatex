logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
Path = require("path")



module.exports = PublicRegistrationController =
	renderAdminPanel : (req, res, next) ->


		res.render Path.resolve(__dirname, "../views/admin"),
			title: 'Admin Panel'
			
