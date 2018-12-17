logger = require('logger-sharelatex')
settings = require('settings-sharelatex')
mmm = require('mmmagic')
fs = require('fs')
path = require('path')
async = require('async')
_ = require('underscore')
urlValidator = require('valid-url')
FileWriter = require("../../../../app/js/infrastructure/FileWriter")
UrlHelper = require('../../../../app/js/Features/Helpers/UrlHelper')
ProjectHelper = require('../../../../app/js/Features/Project/ProjectHelper')
ProjectRootDocManager = require('../../../../app/js/Features/Project/ProjectRootDocManager')
ProjectOptionsHandler = require('../../../../app/js/Features/Project/ProjectOptionsHandler')
ProjectEntityUpdateHandler = require('../../../../app/js/Features/Project/ProjectEntityUpdateHandler')
OpenInOverleafErrors = require('./OpenInOverleafErrors')
Errors = require('../../../../app/js/Features/Errors/Errors')
SafePath = require('../../../../app/js/Features/Project/SafePath')
DocumentHelper = require('../../../../app/js/Features/Documents/DocumentHelper')
V1Api = require('../../../../app/js/Features/V1/V1Api')

module.exports = OpenInOverleafHelper =
	TEMPLATE_DATA: require('../config/templates.json')

	getDocumentLinesFromSnippet: (snippet, content = null) ->
		return (
			snippet.comment + OpenInOverleafHelper._normalizeMainSrcContent(snippet, content)
		).trim().split('\n')

	normalizeLatexContent: (content) ->
		# TODO: handle non-UTF8 content and make best effort to convert.
		# see: https://github.com/overleaf/write_latex/blob/master/main/lib/text_normalization.rb
		return content

	populateSnippetFromUriArray: (uris, source_snippet, callback = (error, results)->) ->
		# add names to uris, if present
		names = source_snippet.snip_name || []
		names = [names] if typeof names is 'string'
		urisWithName = _.map uris, (uri, index) ->
			{uri: uri, name: names[index]}

		async.mapLimit(
			urisWithName
			5
			(uri, mapcb)->
				async.waterfall(
					[
						(cb)->
							FileWriter.writeUrlToDisk 'open_in_overleaf_snippet', UrlHelper.wrapUrlWithProxy(uri.uri), (error, fspath) ->
								return cb(new Errors.NotFoundError) if error?
								cb(null, {uri: uri.uri, fspath: fspath})
						(file, cb)->
							magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE)
							magic.detectFile file.fspath, (error, ctype) ->
								return cb(error) if error?
								file.ctype = ctype
								cb(null, file)
						(file, cb)->
							if file.ctype.match(/^text\//)
								fs.readFile file.fspath, encoding: 'utf8', (error, content) ->
									return cb(error) if error?
									file.content = content
									cb(null, file)
							else
								cb(null, file)
						(file, cb) ->
							file.name = SafePath.clean(uri.name || path.basename(uri.uri))
							cb(null, file)
					]
					mapcb
				)
			(error, files)->
				return callback(error) if error?

				# sort files based on the order supplied so that the user can control project name if more than one .tex document has a documentclass
				groups = _.groupBy(files, (file)-> file.uri)
				files = _.map(uris, (uri)-> groups[uri].shift())

				OpenInOverleafHelper._ensureFilesHaveUniqueNames files, (err) ->
					return callback(err) if err?

					snippet = OpenInOverleafHelper._cloneSnippet(source_snippet)
					snippet.files = files
					OpenInOverleafHelper._setSnippetRootDocAndTitleFromFileArray(snippet)
					callback(null, snippet)
		)

	populateSnippetFromUri: (uri, source_snippet, cb = (error, result)->) ->
		return cb(new OpenInOverleafErrors.InvalidUriError) unless urlValidator.isWebUri(uri)
		uri = UrlHelper.wrapUrlWithProxy(uri)

		# TODO: Implement a file size limit here to prevent shenanigans
		FileWriter.writeUrlToDisk 'open_in_overleaf_snippet', uri, (error, fspath) ->
			return cb(new Errors.NotFoundError) if error? || !fspath?

			magic = new mmm.Magic(mmm.MAGIC_MIME_TYPE)
			magic.detectFile fspath, (error, ctype) ->
				return cb(error) if error?

				snippet = OpenInOverleafHelper._cloneSnippet(source_snippet)

				if ctype == 'application/zip'
					snippet.projectFile = fspath
					cb(null, snippet)
				else if ctype.match(/^text\//)
					# TODO: handle non-UTF8 properly
					fs.readFile fspath, encoding: 'utf8', (error, data) ->
						return cb(error) if error?
						snippet.snip = data
						cb(null, snippet)
				else
					logger.log uri:uri, ctype:ctype, "refusing to open unrecognised content type"
					cb(new OpenInOverleafErrors.InvalidFileTypeError)

	populateSnippetFromTemplate: (template, source_snippet, cb = (error, result)->) ->
		templateData = OpenInOverleafHelper.TEMPLATE_DATA[template]
		return cb(new OpenInOverleafErrors.TemplateNotFoundError) unless templateData?

		snippet = OpenInOverleafHelper._cloneSnippet(source_snippet)

		snippet.brandVariationId = templateData.brand_variation_id if templateData.brand_variation_id?
		OpenInOverleafHelper.populateSnippetFromUri("#{settings.openInOverleaf?.templateUriPrefix}#{template}.zip", snippet, cb)

	populateProjectFromFileList: (project, snippet, callback = (error)->) ->
		async.eachLimit(
			snippet.files
			5
			(file, cb) ->
				if file.content?
					ProjectEntityUpdateHandler.addDoc(
						project._id
						project.rootFolder[0]._id
						file.name
						OpenInOverleafHelper.getDocumentLinesFromSnippet(snippet, file.content)
						project.owner_ref
						cb
					)
				else
					ProjectEntityUpdateHandler.addFile(
						project._id
						project.rootFolder[0]._id
						file.name
						file.fspath
						null
						project.owner_ref
						cb
					)
			(error) ->
				return callback(error) if error?
				if snippet.rootDoc?
					ProjectRootDocManager.setRootDocFromName project._id, snippet.rootDoc, callback
				else
					callback()
		)

	setCompilerForProject: (project, engine, callback = (error)->) ->
		compiler = ProjectHelper.compilerFromV1Engine(engine)

		if compiler?
			ProjectOptionsHandler.setCompiler project._id, compiler, callback
		else
			callback()

	setProjectBrandVariationFromSlug: (project, publisherSlug, callback = (error)->) ->
		async.waterfall(
			[
				(cb) ->
					V1Api.request { uri: "/api/v2/brands/#{encodeURIComponent(publisherSlug)}" }, (err, response, body) ->
						return cb(new OpenInOverleafErrors.PublisherNotFoundError) if err?.statusCode == 404 || response?.statusCode == 404 || !body?.default_variation_id?
						return cb(err) if err?

						cb(null, body.default_variation_id)
				(brandVariationId, cb) ->
					ProjectOptionsHandler.setBrandVariationId project._id, brandVariationId, (err) ->
						cb(err)
			]
			callback
		)

	_normalizeMainSrcContent: (snippet, content = null) ->
		r = OpenInOverleafHelper._wrapSnippetIfNoDocumentClass(OpenInOverleafHelper.normalizeLatexContent(content || snippet.snip), snippet.defaultTitle)
		return r

	_wrapSnippetIfNoDocumentClass: (content, title) ->
		unless content.match /\\documentclass/
			content = """
\\documentclass[12pt]{article}
\\usepackage[english]{babel}
\\usepackage[utf8x]{inputenc}
\\usepackage{amsmath}
\\usepackage{tikz}
\\begin{document}
\\title{#{title}}
#{content}
\\end{document}
"""
		return content

	_cloneSnippet: (snippet) ->
		return JSON.parse(JSON.stringify(snippet))

	_ensureFilesHaveUniqueNames: (files, callback) ->
		# ensure all files have unique names:
		# keep track of unique filenames for each file extension, so when generating a unique filename we can put the
		# suffix before the extension if one is necessary. e.g. "main (2).tex" instead of "main.tex (2)"
		filenamesByExtension = {}
		for file in files
			ext = path.extname(file.name)
			filenamesByExtension[ext] = [] unless filenamesByExtension[ext]?
			base = file.name.substring(0, file.name.length - ext.length)
			ProjectHelper.ensureNameIsUnique filenamesByExtension[ext], base, [], 100, (error, name) ->
				return callback(error) if error?
				file.name = "#{name}#{ext}"
				filenamesByExtension[ext].push(name)
		callback()

	_setSnippetRootDocAndTitleFromFileArray: (snippet) ->
		for file in snippet.files
			if file.content?
				snippet.rootDoc = file.name if !snippet.rootDoc? && DocumentHelper.contentHasDocumentclass(file.content)
				title = DocumentHelper.getTitleFromTexContent(file.content)
				if title?
					snippet.title = title
					break if file.name == snippet.rootDoc