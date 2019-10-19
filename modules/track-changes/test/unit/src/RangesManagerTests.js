/* eslint-disable
    camelcase,
    handle-callback-err,
    max-len,
    no-return-assign,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const should = require('chai').should();
const SandboxedModule = require('sandboxed-module');
const assert = require('assert');
const sinon = require('sinon');
const path = require("path");
const modulePath = path.join(__dirname, "../../../app/js/TrackChanges/RangesManager");
const {
    expect
} = require("chai");

describe("TrackChanges RangesManager", function() {
	beforeEach(function() {
		return this.RangesManager = SandboxedModule.require(modulePath, { requires: {
			"../../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler": (this.DocumentUpdaterHandler = {}),
			"../../../../../app/js/Features/Docstore/DocstoreManager": (this.DocstoreManager = {}),
			"../../../../../app/js/Features/User/UserInfoManager": (this.UserInfoManager = {})
		}
	});});

	return describe("getAllChangesUsers", function() {
		beforeEach(function() {
			this.project_id = "mock-project-id";
			this.user_id1 = "mock-user-id-1";
			this.user_id1 = "mock-user-id-2";
			this.docs = [{
				ranges: {
					changes: [{
						op: { i: "foo", p: 42 },
						metadata: {
							user_id: this.user_id1
						}
					}, {
						op: { i: "bar", p: 102 },
						metadata: {
							user_id: this.user_id2
						}
					}]
				}
			}, {
				ranges: {
					changes: [{
						op: { i: "baz", p: 3 },
						metadata: {
							user_id: this.user_id1
						}
					}]
				}
			}];
			this.users = {};
			this.users[this.user_id1] = {"mock": "user-1"};
			this.users[this.user_id2] = {"mock": "user-2"};
			this.UserInfoManager.getPersonalInfo = (user_id, callback) => callback(null, this.users[user_id]);
			sinon.spy(this.UserInfoManager, "getPersonalInfo");
			return this.RangesManager.getAllRanges = sinon.stub().yields(null, this.docs);
		});

		it("should return an array of unique users", function(done) {
			return this.RangesManager.getAllChangesUsers(this.project_id, (error, users) => {
				users.should.deep.equal([{"mock": "user-1"}, {"mock": "user-2"}]);
				return done();
			});
		});

		return it("should only call getPersonalInfo once for each user", function(done) {
			return this.RangesManager.getAllChangesUsers(this.project_id, (error, users) => {
				this.UserInfoManager.getPersonalInfo.calledTwice.should.equal(true);
				return done();
			});
		});
	});
});