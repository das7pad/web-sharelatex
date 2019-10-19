// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const App = require('../../../../../app');
require("logger-sharelatex").logger.level("error");

before(function(done) {
	this.timeout(20000);
	return App.listen(3000, 'localhost', done);
});
