AccountMergeController = require "./AccountMergeController"
LogInToV2Controller = require "./LogInToV2Controller"
AuthenticationController = require "../../../../app/js/Features/Authentication/AuthenticationController"

module.exports = 
	apply: (webRouter) ->
		webRouter.get '/user/confirm_account_merge', AccountMergeController.showConfirmAccountMerge
		webRouter.post '/user/confirm_account_merge', AccountMergeController.confirmAccountMerge
		webRouter.get '/user/login_to_ol_v2', AuthenticationController.requireLogin(), LogInToV2Controller.signAndRedirectToLogInToV2