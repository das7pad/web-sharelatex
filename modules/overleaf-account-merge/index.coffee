AccountMergeRouter = require "./app/js/AccountMergeRouter"
LogInToV2Controller = require('./app/js/LogInToV2Controller')

module.exports = AccountMerge =
	router: AccountMergeRouter

	hooks:
		preDoPassportLogin: (args...) ->
			LogInToV2Controller.doPassportLoginHook(args...)
