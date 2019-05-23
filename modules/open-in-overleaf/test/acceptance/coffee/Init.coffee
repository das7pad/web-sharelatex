App = require '../../../../../app'
require("logger-sharelatex").logger.level("error")

before (done) ->
	App.listen 3000, 'localhost', done
