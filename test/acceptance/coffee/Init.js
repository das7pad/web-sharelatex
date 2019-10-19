App = require '../../../app'
require("logger-sharelatex").logger.level("error")

before (done) ->
	@timeout(20000)
	App.listen 3000, 'localhost', done
