DocMetadata = require "./DocMetadata"
DocumentUpdaterHandler = require "../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler"
Errors = require "../../../../app/js/Features/Errors/Errors"
ObjectId = require("mongojs").ObjectId
Path = require "path"
ProjectDetailsHandler = require "../../../../app/js/Features/Project/ProjectDetailsHandler"
ProjectEntityHandler = require "../../../../app/js/Features/Project/ProjectEntityHandler"
ProjectEntityUpdateHandler = require "../../../../app/js/Features/Project/ProjectEntityUpdateHandler"
ProjectGetter = require "../../../../app/js/Features/Project/ProjectGetter"
ProjectRootDocManager = require "../../../../app/js/Features/Project/ProjectRootDocManager"
Settings = require "settings-sharelatex"
TemplatesManager = require "../../../../app/js/Features/Templates/TemplatesManager"
V1Api = require "../../../../app/js/Features/V1/V1Api"
_ = require "lodash"
async = require "async"
request = require "request"

module.exports = CollabratecManager =

	createProject: (user_id, template_id, title, doc_abstract, keywords, primary_author, collabratec_document_id, collabratec_privategroup_id, callback) ->
		options =
			headers: Accept: "application/json"
			uri: "/latex/templates/-/#{template_id}"
		V1Api.request options, (err, response, body) ->
			return callback new Errors.NotFoundError() if err? && err.statusCode == 404
			return callback err if err?
			TemplatesManager.createProjectFromV1Template null, null, null, body.pub.doc_id, title, body.pub.published_ver_id, user_id, (err, project) ->
				return callback err if err?
				CollabratecManager._injectProjectMetadata project, title, doc_abstract, keywords, (err) ->
					return callback err if err?
					ProjectDetailsHandler.initializeCollabratecProject project._id, title, user_id, collabratec_document_id,collabratec_privategroup_id, (err) ->
						return callback err if err?
						callback null, {
							id: project._id,
							url: "#{Settings.siteUrl}/project/#{project._id}"
						}

	getProjects: (user, token, current_page, page_size, search, callback) ->
		async.parallel {
			v1Projects: (cb) ->
				CollabratecManager._getProjectsV1 token, search, cb
			v2Projects: (cb) ->
				CollabratecManager._getProjectsV2 user, cb
		}, (err, results) ->
			return callback err if err?
			projects = results.v1Projects.concat(results.v2Projects)
			projects = _.orderBy projects, "title"
			if search?
				search = search.toLowerCase()
				projects = projects.filter (project) ->
					project.title.toLowerCase().match(search)
			callback null, CollabratecManager._paginate(projects, current_page, page_size)

	getProjectMetadata: (user, project_id, callback) ->
		projection =
			_id: 1
			lastUpdated: 1
			rootDoc_id: 1
			name: 1
		ProjectRootDocManager.ensureRootDocumentIsValid project_id, (err) ->
			return callback err if err?
			ProjectGetter.getProject project_id, projection, (err, project) ->
				return callback err if err?
				return callback null, CollabratecManager._formatProjectMetadata(project) unless project.rootDoc_id?
				DocumentUpdaterHandler.flushDocToMongo project_id, project.rootDoc_id, (err) ->
					return callback err if err?
					ProjectEntityHandler.getDoc project_id, project.rootDoc_id, (err, lines) ->
						return callback err if err?
						content = DocMetadata.contentFromLines(lines)
						callback null, CollabratecManager._formatProjectMetadata(project, content)

	_formatProjectMetadata: (project, content) ->
		metadata =
			title: project.name
			created_at: new Date(project._id.getTimestamp()).getTime()
			updated_at: new Date(project.lastUpdated).getTime()
			url: "#{Settings.siteUrl}/project/#{project._id}"
		if (content?)
			metadata.doc_abstract = DocMetadata.abstractFromContent content
			metadata.primary_author = DocMetadata.firstAuthorFromContent content
			metadata.keywords = DocMetadata.keywordsFromContent content
		return metadata

	_formatV2Project: (project, user) ->
		collabratecProject = {
			id: project._id
			title: project.name
			created_at: new Date(project._id.getTimestamp()).getTime()
			updated_at: new Date(project.lastUpdated).getTime()
			url: "#{Settings.siteUrl}/project/#{project._id}"
		}

		if (project.collabratecUsers?)
			collabratecUser = project.collabratecUsers.find (collabratecUser) ->
				return collabratecUser.user_id == user._id
			if (collabratecUser?)
				collabratecProject.collabratec_document_id = collabratecUser.collabratec_document_id
				collabratecProject.collabratec_privategroup_id = collabratecUser.collabratec_privategroup_id
				collabratecProject.owned_by_collabratec_service_account = collabratecUser.collabratec_privategroup_id?

		return collabratecProject

	_getProjectsV1: (token, search, callback) ->
		options =
			json:
				page_size: 1000
				search: search
			uri: "/api/v1/collabratec/users/current_user/projects"
		V1Api.oauthRequest options, token, (error, response, body) ->
			return callback error if error?
			callback null, body.projects

	_getProjectsV2: (user, callback) ->
		ProjectGetter.findAllUsersProjects user._id, 'name lastUpdated publicAccesLevel archived owner_ref tokens', (err, projects) ->
			projects = projects.owned.concat(projects.readAndWrite, projects.tokenReadAndWrite)
			projects = projects.map (project) ->
				CollabratecManager._formatV2Project project, user
			callback null, projects

	_injectProjectMetadata: (project, title, doc_abstract, keywords, callback) ->
		ProjectGetter.getProject project._id, { _id: 1, rootDoc_id: 1 }, (err, project) ->
			return callback err if err?
			ProjectEntityHandler.getDoc project._id, project.rootDoc_id, (err, lines, rev) ->
				return callback err if err?
				new_lines = DocMetadata.injectMetadata lines, title, doc_abstract, keywords
				return callback() unless new_lines?
				ProjectEntityUpdateHandler.updateDocLines project._id, project.rootDoc_id, new_lines, rev, {}, callback

	_paginate: (projects=[], current_page, page_size) ->
		total_items = projects.length
		total_pages = Math.ceil(total_items / page_size)
		offset = (current_page-1) * page_size
		projects = projects.slice(offset, offset+page_size)
		return {
			paging: { current_page, total_pages, total_items }
			projects: projects
		}
