SupportRouter = require "./app/js/SupportRouter"
logger = require "logger-sharelatex"

# form_general: does not include the affected project URL input
# form_with_url: includes the affected project URL input

module.exports  =
	router: SupportRouter
	viewIncludes:
		"contactModal": "contact_form/contact_modal"
		"contactModalGeneral": "contact_form/contact_general_modal"
		"contactFormGeneral": "contact_form/form_general"
		"contactFormSupport": "contact_form/form_with_url"