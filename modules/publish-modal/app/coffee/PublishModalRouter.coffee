PublishModalController = require("./PublishModalController")

module.exports = 
	apply: (app)->

		app.get '/journals', PublishModalController.list
		app.get '/journals/:brand_id', PublishModalController.listForBrand
