/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const Settings = require("settings-sharelatex");

module.exports = {

	findLocalPlanInSettings(planCode) {
		for (let plan of Array.from(Settings.plans)) {
			if (plan.planCode === planCode) { return plan; }
		}
		return null;
	}
};

