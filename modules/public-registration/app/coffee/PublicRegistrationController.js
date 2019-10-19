/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let PublicRegistrationController;
const Path = require("path");
const Url = require("url");
const logger = require("logger-sharelatex");
const metrics = require("metrics-sharelatex");
const ReferalAllocator = require("../../../../app/js/Features/Referal/ReferalAllocator");
const UserRegistrationHandler = require("../../../../app/js/Features/User/UserRegistrationHandler");
const UserEmailsConfirmationHandler = require("../../../../app/js/Features/User/UserEmailsConfirmationHandler");
const EmailBuilder = require("../../../../app/js/Features/Email/EmailBuilder");
const _ = require("underscore");
const UserHandler = require("../../../../app/js/Features/User/UserHandler");
const UserSessionsManager = require("../../../../app/js/Features/User/UserSessionsManager");
const AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController");
const AnalyticsManager = require("../../../../app/coffee/Features/Analytics/AnalyticsManager");
const settings = require("settings-sharelatex");

EmailBuilder.templates.welcome = EmailBuilder.CTAEmailTemplate({
	subject() { return `Welcome to ${settings.appName}`; },
	title() { return `Welcome to ${settings.appName}`; },
	greeting() { return "Hi,"; },
	message(opts) { return `\
Thanks for signing up to ${settings.appName}! If you ever get lost, you can [log in again](${settings.siteUrl}/login) with the email address '${opts.to}'.

If you're new to LaTeX, take a look at our [Help Guides](${settings.siteUrl}/learn) and [Templates](${settings.siteUrl}/templates).

Please also take a moment to confirm your email address for ${settings.appName}:\
`; },
	secondaryMessage() { return "PS. We love talking to our users about ShareLaTeX. Reply to this email to get in touch with us directly, whatever the reason. Questions, comments, problems, suggestions, all welcome!"; },
	ctaText() { return "Confirm Email"; },
	ctaURL(opts) { return opts.confirmEmailUrl; }
});

module.exports = (PublicRegistrationController = {
	showRegisterPage(req, res, next) {
		const sharedProjectData = {
			project_name:req.query.project_name,
			user_first_name:req.query.user_first_name
		};

		const newTemplateData = {};
		if (req.session.templateData != null) {
			newTemplateData.templateName = req.session.templateData.templateName;
		}

		return res.render(Path.resolve(__dirname, "../views/register"), {
			title: 'register',
			sharedProjectData,
			newTemplateData,
			new_email:req.query.new_email || ""
		}
		);
	},

	register(req, res, next) {
		logger.log({email: req.body.email}, "attempted register");
		return UserRegistrationHandler.registerNewUser(req.body, function(err, user){
			const redir = AuthenticationController._getRedirectFromSession(req) || "/project";
			if ((err != null) && ((err != null ? err.message : undefined) === "EmailAlreadyRegistered")) {
				if (__guard__(user != null ? user.overleaf : undefined, x => x.id) != null) {
					return res.json({
						message: {
							text: "You are already registered in ShareLaTeX through the Overleaf Beta. Please log in via Overleaf."
						}
					});
				} else {
					return AuthenticationController.passportLogin(req, res, next);
				}
			} else if (err != null) {
				return next(err);
			} else {
				metrics.inc("user.register.success");

				// send mail in the background
				UserEmailsConfirmationHandler.sendConfirmationEmail(user._id, user.email, 'welcome', function() {});

				return req.login(user, function(err) {
					if (err != null) { return callback(err); }
					req.session.justRegistered = true;
					AnalyticsManager.identifyUser(user._id, req.sessionID);
					// copy to the old `session.user` location, for backward-comptability
					req.session.user = req.session.passport.user;
					AuthenticationController._clearRedirectFromSession(req);

					// ignoring errors on these methods. We expect them to log errors, but we want to
					// continue if the fail as the user has already successfully registered and we dont
					// want to show them an error page beyond this point.
					return UserSessionsManager.trackSession(user, req.sessionID, () => UserHandler.populateTeamInvites(user, () => ReferalAllocator.allocate(req.session.referal_id, user._id, req.session.referal_source, req.session.referal_medium, () => res.json({
                        redir,
                        id: user._id.toString(),
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email,
                        created: Date.now()
                    }))));
				});
			}
		});
	}
});

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}