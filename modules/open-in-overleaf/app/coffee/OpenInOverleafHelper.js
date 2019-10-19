/* eslint-disable
    camelcase,
    handle-callback-err,
    max-len,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let OpenInOverleafHelper;
const logger = require('logger-sharelatex');
const settings = require('settings-sharelatex');
const mmm = require('mmmagic');
const fs = require('fs');
const path = require('path');
const async = require('async');
const _ = require('underscore');
const urlValidator = require('valid-url');
const FileWriter = require("../../../../app/js/infrastructure/FileWriter");
const UrlHelper = require('../../../../app/js/Features/Helpers/UrlHelper');
const ProjectHelper = require('../../../../app/js/Features/Project/ProjectHelper');
const ProjectRootDocManager = require('../../../../app/js/Features/Project/ProjectRootDocManager');
const ProjectOptionsHandler = require('../../../../app/js/Features/Project/ProjectOptionsHandler');
const ProjectEntityUpdateHandler = require('../../../../app/js/Features/Project/ProjectEntityUpdateHandler');
const OpenInOverleafErrors = require('./OpenInOverleafErrors');
const Errors = require('../../../../app/js/Features/Errors/Errors');
const SafePath = require('../../../../app/js/Features/Project/SafePath');
const DocumentHelper = require('../../../../app/js/Features/Documents/DocumentHelper');
const V1Api = require('../../../../app/js/Features/V1/V1Api');

module.exports = (OpenInOverleafHelper = {
	TEMPLATE_DATA: require('../config/templates.json'),

	getDocumentLinesFromSnippet(snippet, content = null) {
		return (
			snippet.comment + OpenInOverleafHelper._normalizeMainSrcContent(snippet, content)
		).trim().split('\n');
	},

	normalizeLatexContent(content) {
		// TODO: handle non-UTF8 content and make best effort to convert.
		// see: https://github.com/overleaf/write_latex/blob/master/main/lib/text_normalization.rb
		return content;
	},

	populateSnippetFromUriArray(uris, source_snippet, callback) {
		// add names to uris, if present
		if (callback == null) { callback = function(error, results){}; }
		let names = source_snippet.snip_name || [];
		if (typeof names === 'string') { names = [names]; }
		const urisWithName = _.map(uris, (uri, index) => ({
            uri,
            name: names[index]
        }));

		return async.mapLimit(
			urisWithName,
			5,
			(uri, mapcb) => async.waterfall(
                [
                    cb => FileWriter.writeUrlToDisk('open_in_overleaf_snippet', UrlHelper.wrapUrlWithProxy(uri.uri), function(error, fspath) {
                        if (error != null) { return cb(new Errors.NotFoundError); }
                        return cb(null, {uri: uri.uri, fspath});
                    }),
                    function(file, cb){
                        const magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);
                        return magic.detectFile(file.fspath, function(error, ctype) {
                            if (error != null) { return cb(error); }
                            file.ctype = ctype;
                            return cb(null, file);
                        });
                    },
                    function(file, cb){
                        if (file.ctype.match(/^text\//)) {
                            return fs.readFile(file.fspath, {encoding: 'utf8'}, function(error, content) {
                                if (error != null) { return cb(error); }
                                file.content = content;
                                return cb(null, file);
                            });
                        } else {
                            return cb(null, file);
                        }
                    },
                    function(file, cb) {
                        file.name = SafePath.clean(uri.name || path.basename(uri.uri));
                        return cb(null, file);
                    }
                ],
                mapcb
            ),
			function(error, files){
				if (error != null) { return callback(error); }

				// sort files based on the order supplied so that the user can control project name if more than one .tex document has a documentclass
				const groups = _.groupBy(files, file => file.uri);
				files = _.map(uris, uri => groups[uri].shift());

				return OpenInOverleafHelper._ensureFilesHaveUniqueNames(files, function(err) {
					if (err != null) { return callback(err); }

					const snippet = OpenInOverleafHelper._cloneSnippet(source_snippet);
					snippet.files = files;
					OpenInOverleafHelper._setSnippetRootDocAndTitleFromFileArray(snippet);
					return callback(null, snippet);
			});
		});
	},

	populateSnippetFromUri(uri, source_snippet, cb) {
		if (cb == null) { cb = function(error, result){}; }
		if (!urlValidator.isWebUri(uri)) { return cb(new OpenInOverleafErrors.InvalidUriError); }
		uri = UrlHelper.wrapUrlWithProxy(uri);

		// TODO: Implement a file size limit here to prevent shenanigans
		return FileWriter.writeUrlToDisk('open_in_overleaf_snippet', uri, function(error, fspath) {
			if ((error != null) || (fspath == null)) { return cb(new Errors.NotFoundError); }

			const magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE);
			return magic.detectFile(fspath, function(error, ctype) {
				if (error != null) { return cb(error); }

				const snippet = OpenInOverleafHelper._cloneSnippet(source_snippet);

				if (ctype === 'application/zip') {
					snippet.projectFile = fspath;
					return cb(null, snippet);
				} else if (ctype.match(/^text\//)) {
					// TODO: handle non-UTF8 properly
					return fs.readFile(fspath, {encoding: 'utf8'}, function(error, data) {
						if (error != null) { return cb(error); }
						snippet.snip = data;
						return cb(null, snippet);
					});
				} else {
					logger.log({uri, ctype}, "refusing to open unrecognised content type");
					return cb(new OpenInOverleafErrors.InvalidFileTypeError);
				}
			});
		});
	},

	populateSnippetFromTemplate(template, source_snippet, cb) {
		if (cb == null) { cb = function(error, result){}; }
		const templateData = OpenInOverleafHelper.TEMPLATE_DATA[template];
		if (templateData == null) { return cb(new OpenInOverleafErrors.TemplateNotFoundError); }

		const snippet = OpenInOverleafHelper._cloneSnippet(source_snippet);

		if (templateData.brand_variation_id != null) { snippet.brandVariationId = templateData.brand_variation_id; }
		return OpenInOverleafHelper.populateSnippetFromUri(`${(settings.openInOverleaf != null ? settings.openInOverleaf.templateUriPrefix : undefined)}${template}.zip`, snippet, cb);
	},

	populateSnippetFromConversionJob(partner, clientMediaId, source_snippet, cb) {
		if (cb == null) { cb = function(error, result){}; }
		return V1Api.request({ uri: `/api/v2/partners/${encodeURIComponent(partner)}/conversions/${encodeURIComponent(clientMediaId)}` }, function(err, response, body) {
			if (((err != null ? err.statusCode : undefined) === 404) || ((response != null ? response.statusCode : undefined) === 404) || ((body != null ? body.input_file_uri : undefined) == null)) { return cb(new OpenInOverleafErrors.ConversionNotFoundError); }
			if (err != null) { return cb(err); }

			const snippet = OpenInOverleafHelper._cloneSnippet(source_snippet);
			if (body.brand_variation_id != null) { snippet.brandVariationId = body.brand_variation_id; }
			return OpenInOverleafHelper.populateSnippetFromUri(body.input_file_uri, snippet, cb);
		});
	},

	populateProjectFromFileList(project, snippet, callback) {
		if (callback == null) { callback = function(error){}; }
		return async.eachLimit(
			snippet.files,
			5,
			function(file, cb) {
				if (file.content != null) {
					return ProjectEntityUpdateHandler.addDoc(
						project._id,
						project.rootFolder[0]._id,
						file.name,
						OpenInOverleafHelper.getDocumentLinesFromSnippet(snippet, file.content),
						project.owner_ref,
						cb
					);
				} else {
					return ProjectEntityUpdateHandler.addFile(
						project._id,
						project.rootFolder[0]._id,
						file.name,
						file.fspath,
						null,
						project.owner_ref,
						cb
					);
				}
			},
			function(error) {
				if (error != null) { return callback(error); }
				if (snippet.rootDoc != null) {
					return ProjectRootDocManager.setRootDocFromName(project._id, snippet.rootDoc, callback);
				} else {
					return callback();
				}
		});
	},

	setCompilerForProject(project, engine, callback) {
		if (callback == null) { callback = function(error){}; }
		const compiler = ProjectHelper.compilerFromV1Engine(engine);

		if (compiler != null) {
			return ProjectOptionsHandler.setCompiler(project._id, compiler, callback);
		} else {
			return callback();
		}
	},

	setProjectBrandVariationFromSlug(project, publisherSlug, callback) {
		if (callback == null) { callback = function(error){}; }
		return async.waterfall(
			[
				cb => V1Api.request({ uri: `/api/v2/brands/${encodeURIComponent(publisherSlug)}` }, function(err, response, body) {
                    if (((err != null ? err.statusCode : undefined) === 404) || ((response != null ? response.statusCode : undefined) === 404) || ((body != null ? body.default_variation_id : undefined) == null)) { return cb(new OpenInOverleafErrors.PublisherNotFoundError); }
                    if (err != null) { return cb(err); }

                    return cb(null, body.default_variation_id);
                }),
				(brandVariationId, cb) => ProjectOptionsHandler.setBrandVariationId(project._id, brandVariationId, err => cb(err))
			],
			callback
		);
	},

	setProjectBrandVariationFromId(project, brandVariationId, callback) {
		if (callback == null) { callback = function(error){}; }
		return async.waterfall(
			[
				cb => // ensure the brand variation exists, or we'll create an un-openable project
                V1Api.request(
                    { uri: `/api/v2/brand_variations/${encodeURIComponent(brandVariationId)}` },
                    function(err, response, body) {
						if (((err != null ? err.statusCode : undefined) === 404) || ((response != null ? response.statusCode : undefined) === 404)) { return cb(new OpenInOverleafErrors.PublisherNotFoundError); }
						return cb(err);
					}
                ),
				cb => ProjectOptionsHandler.setBrandVariationId(project._id, brandVariationId, err => cb(err))
			],
			callback
		);
	},

	snippetFileComment(key) {
		if (key == null) { key = 'default'; }
		return {
			default: `\
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%
% Welcome to Overleaf --- just edit your LaTeX on the left,
% and we'll compile it for you on the right. If you open the
% 'Share' menu, you can invite other users to edit at the same
% time. See www.overleaf.com/learn for more info. Enjoy!
%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%\
`,
			texample: `\
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%
%
% Welcome to Overleaf --- just edit your LaTeX on the left,
% and we'll compile it for you on the right. If you open the
% 'Share' menu, you can invite other users to edit at the same
% time. See www.overleaf.com/learn for more info. Enjoy!
%
% Note: you can export the pdf to see the result at full
% resolution.
%
%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%\
`
		}[key] + "\n";
	},

	_normalizeMainSrcContent(snippet, content = null) {
		const r = OpenInOverleafHelper._wrapSnippetIfNoDocumentClass(OpenInOverleafHelper.normalizeLatexContent(content || snippet.snip), snippet.defaultTitle);
		return r;
	},

	_wrapSnippetIfNoDocumentClass(content, title) {
		if (!content.match(/\\documentclass/)) {
			content = `\
\\documentclass[12pt]{article}
\\usepackage[english]{babel}
\\usepackage[utf8x]{inputenc}
\\usepackage{amsmath}
\\usepackage{tikz}
\\begin{document}
\\title{${title}}
${content}
\\end{document}\
`;
		}
		return content;
	},

	_cloneSnippet(snippet) {
		return JSON.parse(JSON.stringify(snippet));
	},

	_ensureFilesHaveUniqueNames(files, callback) {
		// ensure all files have unique names:
		// keep track of unique filenames for each file extension, so when generating a unique filename we can put the
		// suffix before the extension if one is necessary. e.g. "main (2).tex" instead of "main.tex (2)"
		const filenamesByExtension = {};
		for (var file of Array.from(files)) {
			var ext = path.extname(file.name);
			if (filenamesByExtension[ext] == null) { filenamesByExtension[ext] = []; }
			const base = file.name.substring(0, file.name.length - ext.length);
			ProjectHelper.ensureNameIsUnique(filenamesByExtension[ext], base, [], 100, function(error, name) {
				if (error != null) { return callback(error); }
				file.name = `${name}${ext}`;
				return filenamesByExtension[ext].push(name);
			});
		}
		return callback();
	},

	_setSnippetRootDocAndTitleFromFileArray(snippet) {
		return (() => {
			const result = [];
			for (let file of Array.from(snippet.files)) {
				if (file.content != null) {
					if ((snippet.rootDoc == null) && DocumentHelper.contentHasDocumentclass(file.content)) { snippet.rootDoc = file.name; }
					const title = DocumentHelper.getTitleFromTexContent(file.content);
					if (title != null) {
						snippet.title = title;
						if (file.name === snippet.rootDoc) { break; } else {
							result.push(undefined);
						}
					} else {
						result.push(undefined);
					}
				} else {
					result.push(undefined);
				}
			}
			return result;
		})();
	}
});
