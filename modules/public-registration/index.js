// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
const PublicRegistrationRouter = require('./app/js/PublicRegistrationRouter')
const Features = require('../../app/js/infrastructure/Features')

const PublicRegistrationModule = { router: PublicRegistrationRouter }

if (Features.hasFeature('registration')) {
  module.exports = PublicRegistrationModule
} else {
  module.exports = {}
}
