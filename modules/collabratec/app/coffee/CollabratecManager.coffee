V1Api = require "../../../../app/js/Features/V1/V1Api"
ObjectId = require("mongojs").ObjectId
Path = require "path"
ProjectGetter = require "../../../../app/js/Features/Project/ProjectGetter"
Settings = require "settings-sharelatex"
_ = require "lodash"
async = require "async"
request = require "request"

module.exports = CollabratecManager =

	getProjects: (user, token, current_page, page_size, search, callback) ->
		async.parallel {
			v1Projects: (cb) ->
				CollabratecManager._getProjectsV1 token, search, cb
			v2Projects: (cb) ->
				CollabratecManager._getProjectsV2 user, cb
		}, (err, results) ->
			projects = results.v1Projects.concat(results.v2Projects)
			projects = _.orderBy projects, "title"
			if search?
				search = search.toLowerCase()
				projects = projects.filter (project) ->
					project.title.toLowerCase().match(search)
			callback null, CollabratecManager._paginate(projects, current_page, page_size)

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
		# require feature flag
		return callback null, [] unless user.useCollabratecV2
		ProjectGetter.findAllUsersProjects user._id, 'name lastUpdated publicAccesLevel archived owner_ref tokens', (err, projects) ->
			projects = projects.owned.concat(projects.readAndWrite, projects.tokenReadAndWrite)
			projects = projects.map (project) ->
				CollabratecManager._formatV2Project project, user
			callback null, projects

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

	_paginate: (projects=[], current_page, page_size) ->
		total_items = projects.length
		total_pages = Math.ceil(total_items / page_size)
		offset = (current_page-1) * page_size
		projects = projects.slice(offset, offset+page_size)
		return {
			paging: { current_page, total_pages, total_items }
			projects: projects
		}
