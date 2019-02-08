PublishModalController = require("./PublishModalController")

module.exports = 
	apply: (app)->

		app.get '/journals', PublishModalController.list
		app.get '/journals/:brand_id', PublishModalController.listForBrand
		app.get '/latest_template/:project_id',
			PublishModalController.latestTemplate
