AccountMergeController = require "./AccountMergeController"

module.exports = 
	apply: (webRouter) ->
		webRouter.get '/user/confirm_account_merge', AccountMergeController.showConfirmAccountMerge
		webRouter.post '/user/confirm_account_merge', AccountMergeController.confirmAccountMerge
