/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {
    expect
} = require("chai");
const {
    assert
} = require("chai");
const async = require("async");
const User = require("./helpers/User");
const request = require("./helpers/request");
const settings = require("settings-sharelatex");
const redis = require("./helpers/redis");
const _ = require('lodash');

require("./helpers/MockDocstoreApi");
require("./helpers/MockDocUpdaterApi");
require("./helpers/MockProjectHistoryApi");

// Currently this is testing registration via the 'public-registration' module,
// whereas in production we're using the 'overleaf-integration' module.

// Expectations
const expectProjectAccess = function(user, projectId, callback) {
	// should have access to project
	if (callback == null) { callback = function(err,result){}; }
	return user.openProject(projectId, err => {
		expect(err).to.be.oneOf([null, undefined]);
		return callback();
	});
};

const expectNoProjectAccess = function(user, projectId, callback) {
	// should not have access to project page
	if (callback == null) { callback = function(err,result){}; }
	return user.openProject(projectId, err => {
		expect(err).to.be.instanceof(Error);
		return callback();
	});
};

// Actions
const tryLoginThroughRegistrationForm = function(user, email, password, callback) {
	if (callback == null) { callback = function(err, response, body){}; }
	return user.fetchCsrfToken('/register', function(err) {
		if (err != null) { return callback(err); }
		return user.request.post({
			url: "/register",
			json: {
				email,
				password
			}
		}, callback);
	});
};


describe("LoginRateLimit", function() {
	this.timeout(5000);

	before(function() {
		this.user = new User();
		this.badEmail = `bademail+${Math.random()}@example.com`;
		return this.badPassword = 'badpassword';
	});

	return it('should rate limit login attempts after 10 within two minutes', function(done) {
		return this.user.fetchCsrfToken('/login', error => {
			return async.timesSeries(
				15
				, (n, cb) => {
						return this.user.request.post({
							url: "/login",
							json: {
								email: this.badEmail,
								password: this.badPassword
							}
						}, (err, response, body) => {
							return cb(null, __guard__(body != null ? body.message : undefined, x => x.text));
						});
					}
				, (err, results) => {
					// ten incorrect-credentials messages, then five rate-limit messages
					expect(results.length).to.equal(15);
					assert.deepEqual(
						results,
						_.concat(
							_.fill([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 'Your email or password is incorrect. Please try again'),
							_.fill([1, 2, 3, 4, 5], 'This account has had too many login requests. Please wait 2 minutes before trying to log in again')
						)
					);
					return done();
			});
		});
	});
});


describe("CSRF protection", function() {
	this.timeout(5000);

	beforeEach(function() {
		this.user = new User();
		this.email = `test+${Math.random()}@example.com`;
		return this.password = "password11";
	});

	afterEach(function() {
		return this.user.full_delete_user(this.email);
	});

	it('should register with the csrf token', function(done) {
		return this.user.fetchCsrfToken('/register', error => {
				expect(error != null).to.equal(false);
				return this.user.request.post({
					url: "/register",
					json: {
						email: this.email,
						password: this.password
					},
					headers:{
						"x-csrf-token": this.user.csrfToken
					}
				}, (error, response, body) => {
					expect(error != null).to.equal(false);
					expect(response.statusCode).to.equal(200);
					return done();
				});
		});
	});

	it('should fail with no csrf token', function(done) {
		return this.user.fetchCsrfToken('/register', error => {
				return this.user.request.post({
					url: "/register",
					json: {
						email: this.email,
						password: this.password
					},
					headers:{
						"x-csrf-token": ""
					}
				}, (error, response, body) => {
					expect(response.statusCode).to.equal(403);
					return done();
				});
		});
	});

	return it('should fail with a stale csrf token', function(done) {
		return request.get('/register', (err, res, body) => {
			return this.user.parseCsrfToken(body, error => {
				const oldCsrfToken = this.user.csrfToken;
				return this.user.request.get('/register', (err, res, body) => {
					return this.user.request.post({
						url: "/register",
						json: {
							email: this.email,
							password: this.password
						},
						headers:{
							"x-csrf-token": oldCsrfToken
						}
					}, (error, response, body) => {
						expect(response.statusCode).to.equal(403);
						return done();
					});
				});
			});
		});
	});
});

describe("Register", function() {
	this.timeout(5000);

	before(function() {
		return this.user = new User();
	});

	return it('Set emails attribute', function(done) {
		return this.user.register((error, user) => {
			expect(error).to.not.exist;
			expect(user.email).to.equal(this.user.email);
			expect(user.emails).to.exist;
			expect(user.emails).to.be.a('array');
			expect(user.emails.length).to.equal(1);
			expect(user.emails[0].email).to.equal(this.user.email);
			return done();
		});
	});
});

describe("Register with bonus referal id", function() {
	this.timeout(5000);

	before(function(done) {
		this.user1 = new User();
		this.user2 = new User();
		return async.series([
			cb => this.user1.register(cb),
			cb => this.user2.registerWithQuery('?r=' + this.user1.referal_id  + '&rm=d&rs=b', cb)
		], done);
	});

	return it('Adds a referal when an id is supplied and the referal source is "bonus"', function(done) {
		return this.user1.get((error, user) => {
			expect(error).to.not.exist;
			expect(user.refered_user_count).to.equal(1);

			return done();
		});
	});
});

describe("LoginViaRegistration", function() {
	this.timeout(60000);

	before(function(done) {
		this.user1 = new User();
		this.user2 = new User();
		async.series([
			cb => this.user1.login(cb),
			cb => this.user1.logout(cb),
			cb => redis.clearUserSessions(this.user1, cb),
			cb => this.user2.login(cb),
			cb => this.user2.logout(cb),
			cb => redis.clearUserSessions(this.user2, cb)
		], done);
		return this.project_id = null;
	});

	return describe("[Security] Trying to register/login as another user", function() {

		it('should not allow sign in with secondary email', function(done) {
			const secondaryEmail = "acceptance-test-secondary@example.com";
			return this.user1.addEmail(secondaryEmail, err => {
				return this.user1.loginWith(secondaryEmail, err => {
					expect(err != null).to.equal(false);
					return this.user1.isLoggedIn(function(err, isLoggedIn) {
						expect(isLoggedIn).to.equal(false);
						return done();
					});
				});
			});
		});

		it('should have user1 login', function(done) {
			return this.user1.login(function(err) {
				expect(err != null).to.equal(false);
				return done();
			});
		});

		it('should have user1 create a project', function(done) {
			return this.user1.login(err => {
				expect(err != null).to.equal(false);
				return this.user1.createProject('Private Project', (err, project_id) => {
					expect(err != null).to.equal(false);
					this.project_id = project_id;
					return done();
				});
			});
		});

		it('should ensure user1 can access their project', function(done) {
			return expectProjectAccess(this.user1, this.project_id, done);
		});

		it('should ensure user2 cannot access the project', function(done) {
			return expectNoProjectAccess(this.user2, this.project_id, done);
		});

		it('should prevent user2 from login/register with user1 email address', function(done) {
			return tryLoginThroughRegistrationForm(this.user2, this.user1.email, 'totally_not_the_right_password', (err, response, body) => {
				expect(err).to.equal(null);
				expect(body.redir != null).to.equal(false);
				expect(body.message != null).to.equal(true);
				expect(body.message).to.have.all.keys('type', 'text');
				expect(body.message.type).to.equal('error');
				return done();
			});
		});

		return it('should still ensure user2 cannot access the project', function(done) {
			return expectNoProjectAccess(this.user2, this.project_id, done);
		});
	});
});

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}