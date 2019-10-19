/* eslint-disable
    camelcase,
    handle-callback-err,
    max-len,
    no-unused-vars,
    no-use-before-define,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let OpenInOverleafController;
const logger = require('logger-sharelatex');
const Path = require('path');
const URL = require('url-parse');
const async = require('async');
const AuthenticationController = require('../../../../app/js/Features/Authentication/AuthenticationController');
const ProjectCreationHandler = require('../../../../app/js/Features/Project/ProjectCreationHandler');
const ProjectHelper = require('../../../../app/js/Features/Project/ProjectHelper');
const ProjectDetailsHandler = require('../../../../app/js/Features/Project/ProjectDetailsHandler');
const DocumentHelper = require('../../../../app/js/Features/Documents/DocumentHelper');
const ProjectUploadManager = require('../../../../app/js/Features/Uploads/ProjectUploadManager');
const Errors = require('../../../../app/js/Features/Errors/Errors');
const OpenInOverleafHelper = require('./OpenInOverleafHelper');
const OpenInOverleafErrors = require('./OpenInOverleafErrors');

module.exports = (OpenInOverleafController = {
	// /devs documentation page
	showDocumentation(req, res, next){
		return res.render(Path.resolve(__dirname, '../views/documentation'));
	},

	// 'open in overleaf' /docs API
	openInOverleaf(req, res, next){
		const paramCount = (req.body.snip != null) +
			(req.body.encoded_snip != null) +
			(req.body.snip_uri != null) +
			(req.body.zip_uri != null) +
			(req.body.template != null) +
			((req.body.partner != null) && (req.body.client_media_id != null));
		if (paramCount === 0) { return next(new OpenInOverleafErrors.MissingParametersError); }
		if (paramCount > 1) { return next(new OpenInOverleafErrors.AmbiguousParametersError); }

		logger.log({user: user_id}, "creating project from snippet");
		var user_id = AuthenticationController.getLoggedInUserId(req);

		const sendResponse = function(error, project) {
			if (error != null) { return next(error); }
			return OpenInOverleafController._sendResponse(req, res, project);
		};

		return OpenInOverleafController._populateSnippetFromRequest(req, function(err, snippet) {
			if (err != null) { return sendResponse(err); }
			if (snippet.snip != null) {
				return OpenInOverleafController._createProjectFromPostedSnippet(user_id, snippet, sendResponse);
			} else if (snippet.projectFile != null) {
				return OpenInOverleafController._createProjectFromZipArchive(user_id, snippet, sendResponse);
			} else if (snippet.files != null) {
				return OpenInOverleafController._createProjectFromFileList(user_id, snippet, sendResponse);
			} else {
				return next(new OpenInOverleafErrors.MissingParametersError);
			}
		});
	},

	_createProjectFromPostedSnippet(user_id, snippet, callback) {
		if (callback == null) { callback = function(error, project){}; }
		const content = OpenInOverleafHelper.getDocumentLinesFromSnippet(snippet);
		return async.waterfall(
			[
				function(cb) {
					const projectName = typeof snippet.snip_name === 'string' ? snippet.snip_name : DocumentHelper.getTitleFromTexContent(content) || snippet.defaultTitle;
					return ProjectDetailsHandler.generateUniqueName(user_id, ProjectDetailsHandler.fixProjectName(projectName), (err, name) => cb(err, name));
				},
				(projectName, cb) => ProjectCreationHandler.createProjectFromSnippet(user_id, projectName, content, (err, project) => cb(err, project)),
				(project, cb) => OpenInOverleafHelper.setCompilerForProject(project, snippet.engine, err => cb(err, project)),
				function(project, cb) {
					if (snippet.brandVariationId != null) {
						return OpenInOverleafHelper.setProjectBrandVariationFromId(project, snippet.brandVariationId, function(err) {
							if (err != null) { return cb(err); }
							return cb(null, project);
						});
					} else {
						return cb(null, project);
					}
				}
			],
			callback
		);
	},

	_createProjectFromFileList(user_id, snippet, callback) {
		if (callback == null) { callback = function(error, project){}; }
		return async.waterfall(
			[
				cb => ProjectDetailsHandler.generateUniqueName(user_id, ProjectDetailsHandler.fixProjectName(snippet.title || snippet.defaultTitle), (err, name) => cb(err, name)),
				(projectName, cb) => ProjectCreationHandler.createBlankProject(user_id, projectName, (err, project) => cb(err, project)),
				(project, cb) => OpenInOverleafHelper.populateProjectFromFileList(project, snippet, err => cb(err, project)),
				function(project, cb) {
					if (snippet.brandVariationId != null) {
						return OpenInOverleafHelper.setProjectBrandVariationFromId(project, snippet.brandVariationId, function(err) {
							if (err != null) { return cb(err); }
							return cb(null, project);
						});
					} else {
						return cb(null, project);
					}
				}
			],
			callback
		);
	},

	_createProjectFromZipArchive(user_id, snippet, callback) {
		if (callback == null) { callback = function(error, project){}; }
		return async.waterfall(
			[
				function(cb) {
					const projectName = typeof snippet.snip_name === 'string' ? snippet.snip_name : snippet.defaultTitle;
					return ProjectUploadManager.createProjectFromZipArchive(user_id, projectName, snippet.projectFile, function(err, project) {
						if (err != null) { return cb(new OpenInOverleafErrors.ZipExtractError); }
						return cb(null, project);
					});
				},
				function(project, cb) {
					if (snippet.publisherSlug != null) {
						return OpenInOverleafHelper.setProjectBrandVariationFromSlug(project, snippet.publisherSlug, function(err) {
							if (err != null) { return cb(err); }
							return cb(null, project);
						});
					} else if (snippet.brandVariationId != null) {
						return OpenInOverleafHelper.setProjectBrandVariationFromId(project, snippet.brandVariationId, function(err) {
							if (err != null) { return cb(err); }
							return cb(null, project);
						});
					} else {
						return cb(null, project);
					}
				}
			],
			callback
		);
	},

	_populateSnippetFromRequest(req, cb) {
		if (cb == null) { cb = function(error, result){}; }
		const comment = OpenInOverleafController._getMainFileCommentFromSnipRequest(req);
		return OpenInOverleafController._getSnippetContentsFromRequest(req, function(error, snippet) {
			if (error != null) { return cb(error); }
			if ((snippet.snip == null) && (snippet.projectFile == null) && (snippet.files == null)) { return cb(new Errors.InvalidError); }

			snippet.comment = comment;
			if (req.body.engine != null) { snippet.engine = req.body.engine; }
			if (req.body.publisher_slug != null) { snippet.publisherSlug = req.body.publisher_slug; }
			snippet.defaultTitle = OpenInOverleafController._getDefaultTitleFromSnipRequest(req);
			return cb(null, snippet);
		});
	},

	_getSnippetContentsFromRequest(req, cb) {
		if (cb == null) { cb = function(error, snippet){}; }
		const snippet = {};
		if (req.body.snip_name != null) { snippet.snip_name = req.body.snip_name; }
		if (Array.isArray(snippet.snip_name) && (snippet.snip_name.length === 1)) { snippet.snip_name = snippet.snip_name[0]; }
		if (req.body.brand_variation_id != null) { snippet.brandVariationId = req.body.brand_variation_id; }

		if (req.body.snip != null) {
			snippet.snip = req.body.snip;
			return cb(null, snippet);
		} else if (req.body.encoded_snip != null) {
			snippet.snip = decodeURIComponent(req.body.encoded_snip);
			return cb(null, snippet);
		} else if (Array.isArray(req.body.snip_uri)) {
			if (req.body.snip_uri.length === 1) {
				return OpenInOverleafHelper.populateSnippetFromUri(req.body.snip_uri[0], snippet, cb);
			} else {
				return OpenInOverleafHelper.populateSnippetFromUriArray(req.body.snip_uri, snippet, cb);
			}
		} else if ((req.body.snip_uri != null) || (req.body.zip_uri != null)) {
			return OpenInOverleafHelper.populateSnippetFromUri(req.body.snip_uri || req.body.zip_uri, snippet, cb);
		} else if (req.body.template != null) {
			return OpenInOverleafHelper.populateSnippetFromTemplate(req.body.template, snippet, cb);
		} else if ((req.body.partner != null) && (req.body.client_media_id != null)) {
			return OpenInOverleafHelper.populateSnippetFromConversionJob(req.body.partner, req.body.client_media_id, snippet, cb);
		} else {
			return cb(new OpenInOverleafErrors.MissingParametersError);
		}
	},

	_getMainFileCommentFromSnipRequest(req) {
		let comment = '';
		if (req.body.comment !== 'none') {
			const referrer = new URL(req.body.referrer || '');
			if (referrer.hostname && referrer.hostname.match(/texample\.net$/)) {
				comment = OpenInOverleafHelper.snippetFileComment('texample');
			} else {
				comment = OpenInOverleafHelper.snippetFileComment('default');
			}
		}

		return comment;
	},

	_sendResponse(req, res, project) {
		const uri = `/project/${project._id}`;

		if (req.xhr || ((req.headers.accept != null ? req.headers.accept.indexOf('json') : undefined) > -1)) {
			return res.json({redirect: uri, projectId: project._id});
		} else {
			return res.redirect(uri);
		}
	},

	_getDefaultTitleFromSnipRequest(req) {
		const FILE_EXTENSION_REGEX = /\.[^.]+$/;
		const uri = (req.body.zip_uri || req.body.snip_uri);
		if (typeof uri === 'string') {
			return Path.basename(uri).replace(FILE_EXTENSION_REGEX, '');
		}

		return req.i18n.translate('new_snippet_project');
	}
});
