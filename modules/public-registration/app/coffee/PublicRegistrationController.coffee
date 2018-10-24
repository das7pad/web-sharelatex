Path = require "path"
Url = require "url"
logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
ReferalAllocator = require "../../../../app/js/Features/Referal/ReferalAllocator"
UserRegistrationHandler = require("../../../../app/js/Features/User/UserRegistrationHandler")
SubscriptionDomainHandler = require("../../../../app/js/Features/Subscription/SubscriptionDomainHandler")
UserEmailsConfirmationHandler = require("../../../../app/js/Features/User/UserEmailsConfirmationHandler")
EmailBuilder = require("../../../../app/js/Features/Email/EmailBuilder")
_ = require "underscore"
UserHandler = require("../../../../app/js/Features/User/UserHandler")
UserSessionsManager = require("../../../../app/js/Features/User/UserSessionsManager")
AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController")
AnalyticsManager = require("../../../../app/coffee/Features/Analytics/AnalyticsManager")
settings = require "settings-sharelatex"

EmailBuilder.templates.welcome = EmailBuilder.CTAEmailTemplate({
	subject: () -> "Welcome to #{settings.appName}"
	title: () -> "Welcome to #{settings.appName}"
	greeting: () -> "Hi,"
	message: (opts) -> """
Thanks for signing up to #{settings.appName}! If you ever get lost, you can [log in again](#{settings.siteUrl}/login) with the email address '#{opts.to}'.

If you're new to LaTeX, take a look at our [Help Guides](#{settings.siteUrl}/learn) and [Templates](#{settings.siteUrl}/templates).

Please also take a moment to confirm your email address for #{settings.appName}:
	"""
	secondaryMessage: () -> "PS. We love talking to our users about ShareLaTeX. Reply to this email to get in touch with us directly, whatever the reason. Questions, comments, problems, suggestions, all welcome!"
	ctaText: () -> "Confirm Email"
	ctaURL: (opts) -> opts.confirmEmailUrl
})

module.exports = PublicRegistrationController =
	showRegisterPage : (req, res, next) ->
		sharedProjectData =
			project_name:req.query.project_name
			user_first_name:req.query.user_first_name

		newTemplateData = {}
		if req.session.templateData?
			newTemplateData.templateName = req.session.templateData.templateName

		res.render Path.resolve(__dirname, "../views/register"),
			title: 'register'
			sharedProjectData: sharedProjectData
			newTemplateData: newTemplateData
			new_email:req.query.new_email || ""

	register: (req, res, next) ->
		logger.log email: req.body.email, "attempted register"
		UserRegistrationHandler.registerNewUser req.body, (err, user)->
			verifyLink = SubscriptionDomainHandler.getDomainLicencePage(user)
			redir = verifyLink or AuthenticationController._getRedirectFromSession(req) or "/project"
			if err? and err?.message == "EmailAlreadyRegistered"
				if user?.overleaf?.id?
					res.json {
						message:
							text: "You are already registered in ShareLaTeX through the Overleaf Beta. Please log in via Overleaf."
					}
				else
					return AuthenticationController.passportLogin req, res, next
			else if err?
				next(err)
			else
				metrics.inc "user.register.success"

				# send mail in the background
				UserEmailsConfirmationHandler.sendConfirmationEmail(user._id, user.email, 'welcome', () ->)

				req.login user, (err) ->
					return callback(err) if err?
					req.session.justRegistered = true
					AnalyticsManager.identifyUser(user._id, req.sessionID)
					# copy to the old `session.user` location, for backward-comptability
					req.session.user = req.session.passport.user
					AuthenticationController._clearRedirectFromSession(req)

					# ignoring errors on these methods. We expect them to log errors, but we want to
					# continue if the fail as the user has already successfully registered and we dont
					# want to show them an error page beyond this point.
					UserSessionsManager.trackSession user, req.sessionID, () ->
						UserHandler.populateTeamInvites user, () ->
							ReferalAllocator.allocate req.session.referal_id, user._id, req.session.referal_source, req.session.referal_medium, () ->
								res.json
									redir: redir
									id: user._id.toString()
									first_name: user.first_name
									last_name: user.last_name
									email: user.email
									created: Date.now()
