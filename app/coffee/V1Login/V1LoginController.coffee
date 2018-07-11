Path = require 'path'


module.exports = V1Login =

	loginPage: (req, res, next) ->
		res.render(Path.resolve(__dirname, "../../views/v1_login"))

	doLogin: (req, res, next) ->
		return res.status(403).send()
