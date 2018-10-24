PublishModalController = require("./PublishModalController")

module.exports = 
	apply: (app)->

		app.get '/journals', PublishModalController.list
