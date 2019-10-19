/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let UniversityController;
const settings = require("settings-sharelatex");
const logger = require("logger-sharelatex");
const Settings = require("settings-sharelatex");
const sixpack = require("../../infrastructure/Sixpack");



module.exports = (UniversityController = {

	getPage(req, res, next){
		const url = req.url != null ? req.url.toLowerCase().replace(".html","") : undefined;
		return res.redirect(`/i${url}`);
	},

	getIndexPage(req, res){
		return res.redirect("/i/university");
	}
});

