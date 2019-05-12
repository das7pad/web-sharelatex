{request} = require '../V1SharelatexApi'
Settings = require 'settings-sharelatex'
logger = require 'logger-sharelatex'


module.exports = AccountDeleteHandler =

	deleteV1Account: (v1Id, callback=(err)->) ->
		logger.log {v1Id}, "[AccountDeleteHandler] sending request to v1 account-delete api"
		request {
			method: 'POST'
			url: "#{Settings.apis.v1.url}/api/v1/sharelatex/user_delete",
			json: {user_id: v1Id}
		}, (err, response, body) ->
			if err?
				logger.err {err, v1Id}, "[AccountDeleteHandler] error while talking to v1 login api"
				return callback(err)
			if response.statusCode in [200]
				logger.log {v1Id}, "[AccountDeleteHandler] got response from v1 login api"
				callback(null)
			else
				err = new Error("Unexpected status from v1 login api: #{response.statusCode}")
				callback(err)
