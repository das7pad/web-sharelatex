Path = require "path"
Url = require "url"
logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
ReferalAllocator = require "../../../../app/js/Features/Referal/ReferalAllocator"
UserRegistrationHandler = require("../../../../app/js/Features/User/UserRegistrationHandler")
SubscriptionDomainHandler = require("../../../../app/js/Features/Subscription/SubscriptionDomainHandler")
EmailHandler = require("../../../../app/js/Features/Email/EmailHandler")
EmailBuilder = require("../../../../app/js/Features/Email/EmailBuilder")
PersonalEmailLayout = require("../../../../app/js/Features/Email/Layouts/PersonalEmailLayout")
_ = require "underscore"
UserHandler = require("../../../../app/js/Features/User/UserHandler")
UserSessionsManager = require("../../../../app/js/Features/User/UserSessionsManager")
AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController")

EmailBuilder.templates.welcome =
	subject:  _.template "Welcome to ShareLaTeX"
	layout: PersonalEmailLayout
	type:"lifecycle"
	plainTextTemplate: _.template """
Hi <%= first_name %>,

Thanks for signing up to ShareLaTeX! If you ever get lost, you can log in again (<%= siteUrl %>/login) with the email address "<%= to %>".
If you're new to LaTeX, take a look at our Help Guides (<%= siteUrl %>/learn) and Templates (<%= siteUrl %>/templates).

Regards

Henry
ShareLaTeX Co-founder

PS. We love talking to our users about ShareLaTeX. Reply to this email to get in touch with us directly, whatever the reason. Questions, comments, problems, suggestions, all welcome!
"""
	compiledTemplate: _.template """
<p>Hi <%= first_name %>,</p>
<p>Thanks for signing up to ShareLaTeX! If you ever get lost, you can log in again <a href="<%= siteUrl %>/login">here</a> with the email address "<%= to %>".</p>
<p>If you're new to LaTeX, take a look at our <a href="<%= siteUrl %>/learn">Help Guides</a> and <a href="<%= siteUrl %>/templates">Templates</a>.</p>
<p>
Regards, <br>
Henry <br>
ShareLaTeX Co-founder
</p>
<p>PS. We love talking to our users about ShareLaTeX. Reply to this email to get in touch with us directly, whatever the reason. Questions, comments, problems, suggestions, all welcome!<p>
"""

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
			redir: req.query.redir
			sharedProjectData: sharedProjectData
			newTemplateData: newTemplateData
			new_email:req.query.new_email || ""

	register: (req, res, next) ->
		logger.log email: req.body.email, "attempted register"
		UserRegistrationHandler.registerNewUser req.body, (err, user)->
			verifyLink = SubscriptionDomainHandler.getDomainLicencePage(user)
			redir = Url.parse(verifyLink or req.body.redir or "/project").path
			if err? and err?.message == "EmailAlreadyRegistered"
				req._redir = redir
				return AuthenticationController.passportLogin req, res, next
			else if err?
				next(err)
			else
				metrics.inc "user.register.success"
				ReferalAllocator.allocate req.session.referal_id, user._id, req.session.referal_source, req.session.referal_medium

				EmailHandler.sendEmail "welcome", {
					first_name:user.first_name
					to: user.email
				}, () ->

				UserHandler.populateGroupLicenceInvite(user, ->)

				req.login user, (err) ->
					return callback(error) if error?
					req.session.justRegistered = true
					# copy to the old `session.user` location, for backward-comptability
					req.session.user = req.session.passport.user
					UserSessionsManager.trackSession(user, req.sessionID, () ->)
					res.json
						redir:redir
						id:user._id.toString()
						first_name: user.first_name
						last_name: user.last_name
						email: user.email
						created: Date.now()
