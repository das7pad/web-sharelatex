/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let PublishersGetter;
const UserMembershipsHandler = require("../UserMembership/UserMembershipsHandler");
const UserMembershipEntityConfigs = require("../UserMembership/UserMembershipEntityConfigs");
const logger = require('logger-sharelatex');
const _ = require('underscore');

module.exports = (PublishersGetter = {
	getManagedPublishers(user_id, callback) {
		if (callback == null) { callback = function(error, managedPublishers) {}; }
		return UserMembershipsHandler.getEntitiesByUser(UserMembershipEntityConfigs.publisher, user_id, (error, managedPublishers) => callback(error, managedPublishers));
	}
});
