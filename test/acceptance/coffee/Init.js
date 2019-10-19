/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const App = require('../../../app.js');
require("logger-sharelatex").logger.level("error");

before(done => App.listen(3000, 'localhost', done));
