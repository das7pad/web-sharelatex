/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let UserInfoManager;
const UserGetter = require("./UserGetter");

module.exports = (UserInfoManager = {
	getPersonalInfo(user_id, callback) {
		if (callback == null) { callback = function(error) {}; }
		return UserGetter.getUser(user_id, { _id: true, first_name: true, last_name: true, email: true }, callback);
	}
});