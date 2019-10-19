PublicRegistrationRouter = require "./app/js/PublicRegistrationRouter"
Features = require "../../app/js/infrastructure/Features"

PublicRegistrationModule =
	router: PublicRegistrationRouter

if Features.hasFeature('registration')
	module.exports = PublicRegistrationModule
else
	module.exports = {}