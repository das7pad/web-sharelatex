const PublicRegistrationRouter = require("./app/js/PublicRegistrationRouter");
const Features = require("../../app/js/infrastructure/Features");

const PublicRegistrationModule =
	{router: PublicRegistrationRouter};

if (Features.hasFeature('registration')) {
	module.exports = PublicRegistrationModule;
} else {
	module.exports = {};
}