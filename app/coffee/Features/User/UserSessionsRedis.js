let Redis;
const RedisWrapper = require("../../infrastructure/RedisWrapper");
const rclient = RedisWrapper.client("websessions");

module.exports = (Redis = {
	client() {
		return rclient;
	},

	sessionSetKey(user) {
		return `UserSessions:{${user._id}}`;
	}
});
