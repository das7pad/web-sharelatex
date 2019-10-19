/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let RangesManager;
const DocumentUpdaterHandler = require("../../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler");
const DocstoreManager = require("../../../../../app/js/Features/Docstore/DocstoreManager");
const UserInfoManager = require("../../../../../app/js/Features/User/UserInfoManager");
const async = require("async");

module.exports = (RangesManager = {
	getAllRanges(project_id, callback) {
		if (callback == null) { callback = function(error, docs) {}; }
		return DocumentUpdaterHandler.flushProjectToMongo(project_id, function(error) {
			if (error != null) { return callback(error); }
			return DocstoreManager.getAllRanges(project_id, callback);
		});
	},
	
	getAllChangesUsers(project_id, callback) {
		if (callback == null) { callback = function(error, users) {}; }
		const user_ids = {};
		return RangesManager.getAllRanges(project_id, function(error, docs) {
			if (error != null) { return callback(error); }
			const jobs = [];
			for (let doc of Array.from(docs)) {
				for (let change of Array.from((doc.ranges != null ? doc.ranges.changes : undefined) || [])) {
					user_ids[change.metadata.user_id] = true;
				}
			}
			
			return async.mapSeries(Object.keys(user_ids), (user_id, cb) => UserInfoManager.getPersonalInfo(user_id, cb)
			, callback);
		});
	}
});