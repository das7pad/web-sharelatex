/* eslint-disable
    camelcase,
    max-len,
    no-cond-assign,
    no-constant-condition,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let UserAdminController;
const logger = require("logger-sharelatex");
const metrics = require("metrics-sharelatex");
const _ = require("underscore");
const Path = require("path");
const UserGetter = require("../../../../app/js/Features/User/UserGetter");
const UserDeleter = require("../../../../app/js/Features/User/UserDeleter");
const UserUpdater = require("../../../../app/js/Features/User/UserUpdater");
const {User} = require("../../../../app/js/models/User");
const ProjectGetter = require("../../../../app/js/Features/Project/ProjectGetter");
const AuthenticationManager = require("../../../../app/js/Features/Authentication/AuthenticationManager");
const AuthenticationController = require("../../../../app/js/Features/Authentication/AuthenticationController");
const SubscriptionLocator = require("../../../../app/js/Features/Subscription/SubscriptionLocator");
const FeaturesUpdater = require("../../../../app/js/Features/Subscription/FeaturesUpdater");
const async = require("async");
const settings = require("settings-sharelatex");

const EmailHelper = require("../../../../app/js/Features/Helpers/EmailHelper");

module.exports = (UserAdminController = {
	PER_PAGE: 100,

	index(req, res, next){
		logger.log("getting admin request for list of users");
		return UserAdminController._userFind(null, 1, function(err, users, pages){
			if (err != null) { return next(err); }
			return res.render(Path.resolve(__dirname, "../views/user/index"), {users, pages});
		});
	},

	search(req, res, next){
		logger.log({body: req.body}, "getting admin request for search users");
		return UserAdminController._userFind(req.body, req.body.page, function(err, users, pages) {
			if (err != null) { return next(err); }
			return res.send(200, {users, pages});
	});
	},

	_userFind(params, page, cb) {
		let q, query;
		if (cb == null) { cb = function() {}; }
		if ((params != null ? params.regexp : undefined)) {
			query = new RegExp(params != null ? params.query : undefined);
		} else {
			query = EmailHelper.parseEmail(params != null ? params.query : undefined);
		}

		if ((query != null) && params.secondaryEmailSearch) {
			q = { $or: [{ email: query }, { 'emails.email': query }] };
		} else if (query != null) {
			q = { email: query };
		} else {
			q = {};
		}

		const skip = (page - 1) * UserAdminController.PER_PAGE;
		const opts = {limit: UserAdminController.PER_PAGE, skip, sort: {email: 1} };
		logger.log({opts, q}, "user options and query");
		return User.find(q, {first_name:1, email:1, lastLoggedIn:1, loginCount:1}, opts, function(err, users){
			if (err != null) {
				logger.err({err}, "error getting admin data for users list page");
				return cb(err);
			}
			logger.log({opts, q, users_length:(users != null ? users.length : undefined)}, "found users for admin search");
			return User.count(q, function(err, count) {
				if (err != null) { return cb(err); }
				const pages = Math.ceil(count / UserAdminController.PER_PAGE);
				return cb(err, users, pages);
			});
		});
	},

	show(req, res, next){
		const {
            user_id
        } = req.params;
		logger.log({user_id}, "getting admin request for user info");
		return async.parallel({
			user(cb) {
				return UserGetter.getUser(user_id, {
					_id:1, first_name:1, last_name:1, email:1, betaProgram:1, features: 1, isAdmin: 1, awareOfV2: 1, overleaf: 1, emails: 1, signUpDate:1, loginCount:1, lastLoggedIn:1, lastLoginIp:1, refered_user_count: 1, staffAccess: 1
				}, cb);
			},
			projects(cb) {
				return ProjectGetter.findAllUsersProjects(user_id, {
					name:1, lastUpdated:1, publicAccesLevel:1, archived:1, owner_ref:1
				}, function(err, projects) {
					const {owned, readAndWrite, readOnly} = projects;
					if (err != null) { return cb(err); }
					let allProjects = owned.concat(readAndWrite).concat(readOnly);
					allProjects = _.map(allProjects, function(project){
						const projectTimestamp = project._id.toString().substring(0,8);
						project.createdAt = new Date( parseInt( projectTimestamp, 16 ) * 1000 );
						return project;
					});
					return cb(null, allProjects);
				});
			},

			adminSubscription(cb) {
				return SubscriptionLocator.getUsersSubscription(user_id, cb);
			},
			managedSubscription(cb) {
				return SubscriptionLocator.findManagedSubscription(user_id, cb);
			},
			memberSubscriptions(cb) {
				return SubscriptionLocator.getMemberSubscriptions(user_id, cb);
			}
		}, function(err, data) {
			if (err != null) { return next(err); }
			data.isSuperAdmin = UserAdminController._isSuperAdmin(req);
			return res.render(Path.resolve(__dirname, "../views/user/show"), data);
		});
	},

	delete(req, res, next){
		const {
            user_id
        } = req.params;
		logger.log({user_id}, "received admin request to delete user");
		return UserDeleter.deleteUser(user_id, function(err){
			if (err != null) { return next(err); }
			return res.sendStatus(200);
		});
	},

	deleteOverleafV1Link(req, res, next){
		const {
            user_id
        } = req.params;
		logger.log({user_id}, "received admin request to unlink account from v1 Overleaf");
		const update =
			{$unset:{overleaf: ""}};
		return UserUpdater.updateUser(user_id, update, function(err){
			if (err != null) { return next(err); }
			return res.sendStatus(200);
		});
	},


	deleteSecondaryEmail(req, res, next){
		const {
            user_id
        } = req.params;
		const {
            emailToRemove
        } = req.body;
		logger.log({user_id, emailToRemove},  "received request to delete secondary email");
		return UserUpdater.removeEmailAddress(user_id, emailToRemove, function(err){
			if (err != null) { return next(err); }
			return res.sendStatus(200);
		});
	},

	ALLOWED_ATTRIBUTES: [
		'betaProgram',
		'first_name',
		'last_name',
		'features.collaborators',
		'features.versioning',
		'features.dropbox',
		'features.github',
		'features.gitBridge',
		'features.compileTimeout',
		'features.compileGroup',
		'features.templates',
		'features.trackChanges',
		'features.references',
		'features.referencesSearch',
		'features.mendeley',
		'features.zotero',
		'awareOfV2',
		'refered_user_count'
	],
	SUPER_ADMIN_ALLOWED_ATTRIBUTES: [
		'isAdmin',
		'staffAccess.publisherMetrics',
		'staffAccess.publisherManagement',
		'staffAccess.institutionMetrics',
		'staffAccess.institutionManagement',
		'staffAccess.groupMetrics',
		'staffAccess.groupManagement'
	],
	BOOLEAN_ATTRIBUTES: [
		'betaProgram',
		'features.versioning',
		'features.dropbox',
		'features.github',
		'features.gitBridge',
		'features.templates',
		'features.trackChanges',
		'features.references',
		'features.referencesSearch',
		'features.mendeley',
		'features.zotero',
		'staffAccess.publisherMetrics',
		'staffAccess.publisherManagement',
		'staffAccess.institutionMetrics',
		'staffAccess.institutionManagement',
		'staffAccess.groupMetrics',
		'staffAccess.groupManagement',
		'awareOfV2',
		'isAdmin'
	],
	update(req, res, next) {
		const {
            user_id
        } = req.params;
		let allowed_attributes = UserAdminController.ALLOWED_ATTRIBUTES;
		if (UserAdminController._isSuperAdmin(req)) {
			allowed_attributes = allowed_attributes.concat(UserAdminController.SUPER_ADMIN_ALLOWED_ATTRIBUTES);
		}
		const update = UserAdminController._reqToMongoUpdate(
			req.body,
			allowed_attributes,
			UserAdminController.BOOLEAN_ATTRIBUTES
		);
		logger.log({user_id, update}, "updating user via admin panel");
		return User.update({_id: user_id}, { $set: update }, function(err) {
			if (err != null) { return next(err); }
			return res.sendStatus(204);
		});
	},
	
	updateEmail(req, res, next) {
		const {
            user_id
        } = req.params;
		const {
            email
        } = req.body;
		return UserUpdater.changeEmailAddress(user_id, email, function(err) {
			if (err != null) {
				if (err.message = "alread_exists") {
					return res.send(400, {message: "Email is in use by another user"});
				} else {
					return next(err);
				}
			} else {
				return res.sendStatus(204);
			}
		});
	},

	refreshFeatures(req, res, next) {
		const {
            user_id
        } = req.params;
		return FeaturesUpdater.refreshFeatures(user_id, true, function(err) {
			if (err != null) { return next(err); }
			return res.sendStatus(204);
		});
	},

	_reqToMongoUpdate(body, attributes, booleans) {
		const update = {};
		for (let attribute of Array.from(attributes)) {
			if ((body[attribute] == null) && (Array.from(booleans).includes(attribute))) {
				// Unticked checkboxes are not submitted
				update[attribute] = false;
			} else if ((body[attribute] === "on") && (Array.from(booleans).includes(attribute))) {
				// Value of a checkbox is sent as 'on'
				update[attribute] = true;
			} else if (body[attribute] != null) {
				update[attribute] = body[attribute];
			}
		}
		return update;
	},

	_isSuperAdmin(req) {
		const current_user_id = AuthenticationController.getLoggedInUserId(req);
		if ((settings.superAdminUserIds != null) && Array.from(settings.superAdminUserIds).includes(current_user_id)) {
			return true;
		} else {
			return false;
		}
	}
});

