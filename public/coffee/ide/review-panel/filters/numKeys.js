/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
	"base"
], App =>
	app.filter("numKeys", () =>
		function(object) { 
			if (object != null) {
				return Object.keys(object).length;
			} else {
				return 0;
			}
		}
	)
);
