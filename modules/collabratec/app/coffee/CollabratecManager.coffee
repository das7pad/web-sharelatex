CollabratecApi = require "./CollabratecApi"
DocMetadata = require "./DocMetadata"
DocumentUpdaterHandler = require "../../../../app/js/Features/DocumentUpdater/DocumentUpdaterHandler"
Errors = require "../../../../app/js/Features/Errors/Errors"
ObjectId = require("mongojs").ObjectId
Path = require "path"
ProjectCollabratecDetailsHandler = require "../../../../app/js/Features/Project/ProjectCollabratecDetailsHandler"
ProjectDeleter = require "../../../../app/js/Features/Project/ProjectDeleter"
ProjectDetailsHandler = require "../../../../app/js/Features/Project/ProjectDetailsHandler"
ProjectDuplicator = require "../../../../app/js/Features/Project/ProjectDuplicator"
ProjectEntityHandler = require "../../../../app/js/Features/Project/ProjectEntityHandler"
ProjectEntityUpdateHandler = require "../../../../app/js/Features/Project/ProjectEntityUpdateHandler"
ProjectGetter = require "../../../../app/js/Features/Project/ProjectGetter"
ProjectRootDocManager = require "../../../../app/js/Features/Project/ProjectRootDocManager"
ProjectUploadManager = require "../../../../app/js/Features/Uploads/ProjectUploadManager"
Settings = require "settings-sharelatex"
TemplatesManager = require "../../../../app/js/Features/Templates/TemplatesManager"
UserGetter = require "../../../../app/js/Features/User/UserGetter"
V1Api = require "../../../../app/js/Features/V1/V1Api"
_ = require "lodash"
async = require "async"
fs = require "fs"
logger = require "logger-sharelatex"

module.exports = CollabratecManager =
	cloneProject: (user, project_id, protect, new_collabratec_document_id, new_owner_collabratec_customer_id, collabratec_privategroup_id, callback) ->
		ProjectGetter.getProject project_id, {name: 1}, (err, project) ->
			return callback err if err?
			ProjectDetailsHandler.generateUniqueName user._id, project.name, (err, project_name) ->
				return callback err if err?
				ProjectDuplicator.duplicate user, project_id, project_name, (err, project) ->
					return callback err if err?
					ProjectCollabratecDetailsHandler.initializeCollabratecProject project._id, user._id, new_collabratec_document_id,collabratec_privategroup_id, (err) ->
						return callback err if err?
						callback null, {
							id: project._id,
							url: "#{Settings.siteUrl}/project/#{project._id}"
						}

	createProject: (user_id, template_id, title, doc_abstract, keywords, primary_author, collabratec_document_id, collabratec_privategroup_id, callback) ->
		options =
			headers: Accept: "application/json"
			uri: "/latex/templates/-/#{template_id}"
		V1Api.request options, (err, response, body) ->
			return callback new Errors.NotFoundError() if err? && err.statusCode == 404
			return callback err if err?
			TemplatesManager.createProjectFromV1Template null, null, null, body.pub.doc_id, title, body.pub.published_ver_id, user_id, (err, project) ->
				return callback err if err?
				CollabratecManager._injectProjectMetadata user_id, project, title, doc_abstract, keywords, (err) ->
					return callback err if err?
					ProjectCollabratecDetailsHandler.initializeCollabratecProject project._id, user_id, collabratec_document_id,collabratec_privategroup_id, (err) ->
						return callback err if err?
						callback null, {
							id: project._id,
							url: "#{Settings.siteUrl}/project/#{project._id}"
						}

	deleteProject: (project_id, callback) ->
		ProjectDeleter.archiveProject project_id, callback

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

	getProjectMetadata: (project_id, callback) ->
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

	getUserByCollabratecId: (collabratec_id, callback) ->
		V1Api.request {
			expectedStatusCodes: [404]
			qs: { collabratec_id }
			uri: "/api/v1/sharelatex/user_collabratec_id"
		}, (err, response, body) ->
			return callback err if err?
			return callback null, null unless body?.id?
			UserGetter.getUser {"overleaf.id": parseInt(body.id)}, (err, user) ->
				callback err if err?
				return callback null, user

	linkProject: (project_id, user_id, collabratec_document_id, callback) ->
		ProjectCollabratecDetailsHandler.linkCollabratecUserProject project_id, user_id, collabratec_document_id, (err) ->
			return callback err if err?
			CollabratecManager.getProjectMetadata project_id, callback

	unlinkProject: (project_id, user_id, callback) ->
		ProjectCollabratecDetailsHandler.unlinkCollabratecUserProject project_id, user_id, callback

	uploadProject: (user_id, file, collabratec_document_id, collabratec_privategroup_id, callback) ->
		name = Path.basename(file.originalname, ".zip")
		ProjectUploadManager.createProjectFromZipArchive user_id, name, file.path, (err, project) ->
			# always delete upload but continue on errors
			fs.unlink file.path, (err) ->
				logger.error { err }, "error deleting collabratec zip upload"
			return callback err if err?
			ProjectCollabratecDetailsHandler.initializeCollabratecProject project._id, user_id, collabratec_document_id, collabratec_privategroup_id, (err) ->
				return callback err if err?
				CollabratecManager.getProjectMetadata project._id, (err, project_metadata) ->
					return callback err if err?
					callback null, project, project_metadata

	uploadProjectCallback: (collabratec_customer_id, collabratec_document_id, project_id, project_metadata, callback) ->
		upload_status = if project_metadata? then "success" else "failure"
		options =
			json:
				storageProviderId: project_id
				viewerLink: project_metadata?.url
				collabratecDocumentID: collabratec_document_id
				documentTitle: project_metadata?.title
				docAbstract: project_metadata?.doc_abstract
				primaryAuthor: project_metadata?.primary_author
				keyWords: project_metadata?.keywords
				uploadStatus: upload_status
				uploadMessages: []
			method: "post"
			uri: "/ext/v1/document/callback/overleaf/project"
		CollabratecApi.request collabratec_customer_id, options, callback

	_formatProjectMetadata: (project, content) ->
		metadata =
			title: project.name
			created_at: new Date(project._id.getTimestamp()).getTime()
			updated_at: new Date(project.lastUpdated).getTime()
			url: CollabratecManager._projectUrl project._id
		if (content?)
			metadata.doc_abstract = DocMetadata.abstractFromContent content
			metadata.primary_author = DocMetadata.firstAuthorFromContent content
			metadata.keywords = DocMetadata.keywordsFromContent content
		return metadata

	_formatV2Project: (project, user) ->
		# continue to use v1 project id because collabratec may already have
		# this in their system for this project
		project_id = if project.overleaf?.id && project.tokens?.readAndWrite then project.tokens?.readAndWrite else project._id
		collabratecProject = {
			id: project_id
			title: project.name
			created_at: new Date(project._id.getTimestamp()).getTime()
			updated_at: new Date(project.lastUpdated).getTime()
			# always return the new v2 project url
			url: CollabratecManager._projectUrl project._id
		}

		if (project.collabratecUsers?)
			# if is possible (though unlikely) to have multiple entries with different collabratec
			# document ids for the same user so use reverse to find the most recently added entry
			collabratecUser = project.collabratecUsers.reverse().find (collabratecUser) ->
				return collabratecUser.user_id.toString() == user._id.toString()
			if (collabratecUser?)
				collabratecProject.collabratec_document_id = collabratecUser.collabratec_document_id
				collabratecProject.collabratec_privategroup_id = collabratecUser.collabratec_privategroup_id
				collabratecProject.owned_by_collabratec_service_account = if collabratecUser.collabratec_privategroup_id? then "true" else "false"

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
		ProjectGetter.findAllUsersProjects user._id, 'name lastUpdated publicAccesLevel archived overleaf owner_ref tokens collabratecUsers', (err, projects) ->
			projects = projects.owned.concat(projects.readAndWrite, projects.tokenReadAndWrite)
			projects = projects.filter (project) ->
				return false if project.archived
				return true
			projects = projects.map (project) ->
				CollabratecManager._formatV2Project project, user
			callback null, projects

	_injectProjectMetadata: (user_id, project, title, doc_abstract, keywords, callback) ->
		ProjectGetter.getProject project._id, { _id: 1, rootDoc_id: 1 }, (err, project) ->
			return callback err if err?
			ProjectEntityHandler.getDoc project._id, project.rootDoc_id, (err, lines, rev) ->
				return callback err if err?
				new_lines = DocMetadata.injectMetadata lines, title, doc_abstract, keywords
				return callback() unless new_lines?
				DocumentUpdaterHandler.setDocument project._id, project.rootDoc_id, user_id, new_lines, "collabratec", callback

	_paginate: (projects=[], current_page, page_size) ->
		total_items = projects.length
		total_pages = Math.ceil(total_items / page_size)
		offset = (current_page-1) * page_size
		projects = projects.slice(offset, offset+page_size)
		return {
			paging: { current_page, total_pages, total_items }
			projects: projects
		}

	_projectUrl: (project_id) ->
		return "#{Settings.siteUrl}/org/ieee/collabratec/projects/#{project_id}"
