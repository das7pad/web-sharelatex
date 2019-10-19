/* eslint-disable
    camelcase,
    handle-callback-err,
    max-len,
    no-return-assign,
    no-undef,
    no-unused-vars,
    no-useless-escape,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const request = require("./request");
const _ = require("underscore");
const settings = require("settings-sharelatex");
const {db, ObjectId} = require("../../../../app/js/infrastructure/mongojs");
const UserModel = require("../../../../app/js/models/User").User;
const UserUpdater = require("../../../../app/js/Features/User/UserUpdater");
const AuthenticationManager = require("../../../../app/js/Features/Authentication/AuthenticationManager");

let count = Math.random();

class User {
	constructor(options) {
		this.fetchCsrfToken = this.fetchCsrfToken.bind(this);
		this.parseCsrfToken = this.parseCsrfToken.bind(this);
		this.setCsrfToken = this.setCsrfToken.bind(this);
		if (options == null) { options = {}; }
		this.emails = [{
			email: options.email || `acceptance-test-${count}@example.com`,
			createdAt: new Date()
		}
		];
		this.email = this.emails[0].email;
		this.password = `acceptance-test-${count}-password`;
		count++;
		this.jar = request.jar();
		this.request = request.defaults({
			jar: this.jar
		});
	}

	setExtraAttributes(user) {
		if ((user != null ? user._id : undefined) == null) { throw new Error("User does not exist"); }
		this.id = user._id.toString();
		this._id = user._id.toString();
		this.first_name = user.first_name;
		return this.referal_id = user.referal_id;
	}

	get(callback) {
		if (callback == null) { callback = function(error, user){}; }
		db.users.findOne({ _id: ObjectId(this._id) }, callback);
		return null;
	}

	mongoUpdate(updateOp, callback) {
		if (callback == null) { callback = function(error){}; }
		db.users.update({_id: ObjectId(this._id)}, updateOp, callback);
		return null;
	}

	register(callback) {
		if (callback == null) { callback = function(error, user) {}; }
		return this.registerWithQuery('', callback);
	}

	registerWithQuery(query, callback) {
		if (callback == null) { callback = function(error, user) {}; }
		if (this._id != null) { return callback(new Error('User already registered')); }
		return this.fetchCsrfToken('/register', error => {
			if (error != null) { return callback(error); }
			return this.request.post({
				url: '/register' + query,
				json: { email: this.email, password: this.password }
			}, (error, response, body) => {
				if (error != null) { return callback(error); }
				return db.users.findOne({ email: this.email }, (error, user) => {
					if (error != null) { return callback(error); }
					this.setExtraAttributes(user);
					return callback(null, user);
				});
			});
		});
	}

	login(callback) {
		if (callback == null) { callback = function(error) {}; }
		return this.loginWith(this.email, callback);
	}

	loginWith(email, callback) {
		if (callback == null) { callback = function(error) {}; }
		return this.ensureUserExists(error => {
			if (error != null) { return callback(error); }
			const endpoint = settings.enableLegacyLogin ? "/login/legacy" : "/login";
			return this.fetchCsrfToken(endpoint, error => {
				if (error != null) { return callback(error); }
				return this.request.post({
					url: endpoint,
					json: { email, password: this.password }
				}, callback);
			});
		});
	}

	ensureUserExists(callback) {
		if (callback == null) { callback = function(error) {}; }
		const filter = {email: this.email};
		const options = {upsert: true, new: true, setDefaultsOnInsert: true};
		UserModel.findOneAndUpdate(filter, {}, options, (error, user) => {
			if (error != null) { return callback(error); }
			return AuthenticationManager.setUserPasswordInV2(user._id, this.password, error => {
				if (error != null) { return callback(error); }
				return UserUpdater.updateUser(user._id, {$set: {emails: this.emails}}, error => {
					if (error != null) { return callback(error); }
					this.setExtraAttributes(user);
					return callback(null, this.password);
				});
			});
		});
		return null;
	}

	setFeatures(features, callback) {
		if (callback == null) { callback = function(error) {}; }
		const update = {};
		for (let key in features) {
			const value = features[key];
			update[`features.${key}`] = value;
		}
		UserModel.update({ _id: this.id }, update, callback);
		return null;
	}

	setOverleafId(overleaf_id, callback) {
		if (callback == null) { callback = function(error) {}; }
		UserModel.update({ _id: this.id }, { 'overleaf.id': overleaf_id }, callback);
		return null;
	}

	logout(callback) {
		if (callback == null) { callback = function(error) {}; }
		return this.getCsrfToken(error => {
			if (error) {
				this.csrfToken = undefined;
				return callback(error);
			}
			return this.request.post({
				url: "/logout",
				json: {
					email: this.email,
					password: this.password
				}
			}, (error, response, body) => {
				this.csrfToken = undefined;
				if (error != null) { return callback(error); }
				return db.users.findOne({email: this.email}, (error, user) => {
					if (error != null) { return callback(error); }
					this.id = __guard__(user != null ? user._id : undefined, x => x.toString());
					this._id = __guard__(user != null ? user._id : undefined, x1 => x1.toString());
					return callback();
				});
			});
		});
	}

	addEmail(email, callback) {
		if (callback == null) { callback = function(error) {}; }
		this.emails.push({email, createdAt: new Date()});
		UserUpdater.addEmailAddress(this.id, email, callback);
		return null;
	}

	confirmEmail(email, callback) {
		if (callback == null) { callback = function(error) {}; }
		for (let idx = 0; idx < this.emails.length; idx++) {
			const emailData = this.emails[idx];
			if (emailData.email === email) { this.emails[idx].confirmedAt = new Date(); }
		}
		UserUpdater.confirmEmail(this.id, email, callback);
		return null;
	}

	ensure_admin(callback) {
		if (callback == null) { callback = function(error) {}; }
		db.users.update({_id: ObjectId(this.id)}, { $set: { isAdmin: true }}, callback);
		return null;
	}

	upgradeFeatures(callback ) {
		if (callback == null) { callback = function(error) {}; }
		const features = {
			collaborators: -1, // Infinite
			versioning: true,
			dropbox:true,
			compileTimeout: 60,
			compileGroup:"priority",
			templates: true,
			references: true,
			trackChanges: true,
			trackChangesVisible: true
		};
		db.users.update({_id: ObjectId(this.id)}, { $set: { features }}, callback);
		return null;
	}

	downgradeFeatures(callback ) {
		if (callback == null) { callback = function(error) {}; }
		const features = {
			collaborators: 1,
			versioning: false,
			dropbox:false,
			compileTimeout: 60,
			compileGroup:"standard",
			templates: false,
			references: false,
			trackChanges: false,
			trackChangesVisible: false
		};
		db.users.update({_id: ObjectId(this.id)}, { $set: { features }}, callback);
		return null;
	}

	defaultFeatures(callback ) {
		if (callback == null) { callback = function(error) {}; }
		const features = settings.defaultFeatures;
		db.users.update({_id: ObjectId(this.id)}, { $set: { features }}, callback);
		return null;
	}

	full_delete_user(email, callback) {
		if (callback == null) { callback = function(error) {}; }
		db.users.findOne({email}, (error, user) => {
			if ((user == null)) {
				return callback();
			}
			const user_id = user._id;
			return db.projects.remove({owner_ref:ObjectId(user_id)}, {multi:true}, function(err){
				if (err != null) {
					callback(err);
				}
				return db.users.remove({_id: ObjectId(user_id)}, callback);
			});
		});
		return null;
	}

	getProject(project_id, callback) {
		if (callback == null) { callback = function(error, project){}; }
		db.projects.findOne({_id: ObjectId(project_id.toString())}, callback);
		return null;
	}

	saveProject(project, callback) {
		if (callback == null) { callback = function(error){}; }
		db.projects.update({_id: project._id}, project, callback);
		return null;
	}

	createProject(name, options, callback) {
		if (callback == null) { callback = function(error, oroject_id) {}; }
		if (typeof options === "function") {
			callback = options;
			options = {};
		}

		this.request.post({
			url: "/project/new",
			json: Object.assign({projectName: name}, options)
		}, function(error, response, body) {
			if (error != null) { return callback(error); }
			if (((body != null ? body.project_id : undefined) == null)) {
				error = new Error("SOMETHING WENT WRONG CREATING PROJECT", response.statusCode, response.headers["location"], body);
				return callback(error);
			} else {
				return callback(null, body.project_id);
			}
		});
		return null;
	}

	deleteProject(project_id, callback) {
		if (callback == null) { callback = error; }
		return this.request.delete({
			url: `/project/${project_id}`
		}, function(error, response, body) {
			if (error != null) { return callback(error); }
			return callback(null);
		});
	}

	deleteProjects(callback) {
		if (callback == null) { callback = error; }
		db.projects.remove({owner_ref:ObjectId(this.id)}, {multi:true}, err => callback(err));
		return null;
	}

	openProject(project_id, callback) {
		if (callback == null) { callback = error; }
		this.request.get({
			url: `/project/${project_id}`
		}, function(error, response, body) {
			if (error != null) { return callback(error); }
			if (response.statusCode !== 200) {
				const err = new Error(`Non-success response when opening project: ${response.statusCode}`);
				return callback(err);
			}
			return callback(null);
		});
		return null;
	}

	createDocInProject(project_id, parent_folder_id, name, callback) {
		if (callback == null) { callback = function(error, doc_id){}; }
		return this.getCsrfToken(error => {
			if (error != null) { return callback(error); }
			return this.request.post({
				url: `/project/${project_id}/doc`,
				json: {
					name,
					parent_folder_id
				}
			}, (error, response, body) => {
				return callback(null, body._id);
			});
		});
	}

	addUserToProject(project_id, user, privileges, callback) {
		let updateOp;
		if (callback == null) { callback = function(error, user) {}; }
		if (privileges === 'readAndWrite') {
			updateOp = {$addToSet: {collaberator_refs: user._id.toString()}};
		} else if (privileges === 'readOnly') {
			updateOp = {$addToSet: {readOnly_refs: user._id.toString()}};
		}
		return db.projects.update({_id: db.ObjectId(project_id)}, updateOp, err => callback(err));
	}

	makePublic(project_id, level, callback) {
		if (callback == null) { callback = function(error) {}; }
		this.request.post({
			url: `/project/${project_id}/settings/admin`,
			json: {
				publicAccessLevel: level
			}
		}, function(error, response, body) {
			if (error != null) { return callback(error); }
			return callback(null);
		});
		return null;
	}

	makePrivate(project_id, callback) {
		if (callback == null) { callback = function(error) {}; }
		this.request.post({
			url: `/project/${project_id}/settings/admin`,
			json: {
				publicAccessLevel: 'private'
			}
		}, function(error, response, body) {
			if (error != null) { return callback(error); }
			return callback(null);
		});
		return null;
	}

	makeTokenBased(project_id, callback) {
		if (callback == null) { callback = function(error) {}; }
		this.request.post({
			url: `/project/${project_id}/settings/admin`,
			json: {
				publicAccessLevel: 'tokenBased'
			}
		}, function(error, response, body) {
			if (error != null) { return callback(error); }
			return callback(null);
		});
		return null;
	}

	fetchCsrfToken(params, callback) {
		if (params == null) { params = '/'; }
		if (callback == null) { callback = function(error){}; }
		if (this.csrfToken) { return callback(null); }
		this.request.get(params, (err, response, body) => {
			return this.parseCsrfToken(body, callback);
		});
		return null;
	}

	parseCsrfToken(body, callback) {
		if (callback == null) { callback = function(error){}; }
		const match = /window.csrfToken\ = "(.+)"/.exec(body);
		if (!match) { return callback(new Error('body has no csrf token')); }
		this.setCsrfToken(match[1]);
		return callback(null);
	}

	setCsrfToken(token) {
		this.csrfToken = token;
		return this.request = this.request.defaults({
			headers: {
				"x-csrf-token": this.csrfToken
			}
		});
	}

	getCsrfToken(callback) {
		if (callback == null) { callback = function(error) {}; }
		if (this.csrfToken) { return callback(); }
		this.request.get({
			url: "/dev/csrf"
		}, (err, response, body) => {
			if (err != null) { return callback(err); }
			if (response.statusCode !== 200) {
				return callback(new Error(response.statusCode));
			}
			this.setCsrfToken(body);
			return callback();
		});
		return null;
	}

	changePassword(callback) {
		if (callback == null) { callback = function(error) {}; }
		return this.getCsrfToken(error => {
			if (error != null) { return callback(error); }
			return this.request.post({
				url: "/user/password/update",
				json: {
					currentPassword: this.password,
					newPassword1: this.password,
					newPassword2: this.password
				}
			}, (error, response, body) => {
				if (error != null) { return callback(error); }
				return db.users.findOne({email: this.email}, (error, user) => {
					if (error != null) { return callback(error); }
					return callback();
				});
			});
		});
	}

	reconfirmAccountRequest(user_email, callback) {
		if (callback == null) { callback = function(error) {}; }
		return this.getCsrfToken(error => {
			if (error != null) { return callback(error); }
			return this.request.post({
				url: "/user/reconfirm",
				json: {
					email: user_email
				}
			}, (error, response, body) => {
				return callback(error, response);
			});
		});
	}
					
	getUserSettingsPage(callback) {
		if (callback == null) { callback = function(error, statusCode) {}; }
		return this.getCsrfToken(error => {
			if (error != null) { return callback(error); }
			return this.request.get({
				url: "/user/settings"
			}, (error, response, body) => {
				if (error != null) { return callback(error); }
				return callback(null, response.statusCode);
			});
		});
	}

	activateSudoMode(callback) {
		if (callback == null) { callback = function(error){}; }
		return this.getCsrfToken(error => {
			if (error != null) { return callback(error); }
			return this.request.post({
				uri: '/confirm-password',
				json: {
					password: this.password
				}
			}, callback);
		});
	}

	updateSettings(newSettings, callback) {
		if (callback == null) { callback = function(error, response, body) {}; }
		return this.getCsrfToken(error => {
			if (error != null) { return callback(error); }
			return this.request.post({
				url: '/user/settings',
				json: newSettings
			}, callback);
		});
	}

	getProjectListPage(callback) {
		if (callback == null) { callback = function(error, statusCode){}; }
		return this.getCsrfToken(error => {
			if (error != null) { return callback(error); }
			return this.request.get({
				url: "/project"
			}, (error, response, body) => {
				if (error != null) { return callback(error); }
				return callback(null, response.statusCode);
			});
		});
	}

	isLoggedIn(callback) {
		if (callback == null) { callback = function(error, loggedIn) {}; }
		this.request.get("/user/personal_info", function(error, response, body) {
			if (error != null) { return callback(error); }
			if (response.statusCode === 200) {
				return callback(null, true);
			} else if (response.statusCode === 302) {
				return callback(null, false);
			} else {
				return callback(new Error(`unexpected status code from /user/personal_info: ${response.statusCode}`));
			}
		});
		return null;
	}

	setV1Id(v1Id, callback) {
		UserModel.update({
			_id: this._id
		}, {
			overleaf: {
				id: v1Id
			}
		}, callback);
		return null;
	}
}

module.exports = User;

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}