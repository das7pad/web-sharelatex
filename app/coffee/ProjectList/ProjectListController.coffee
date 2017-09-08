{User} = require "../../../../../app/js/models/User"
ProjectGetter = require "../../../../../app/js/Features/Project/ProjectGetter"

module.exports = ProjectListController =
	listProjects: (req, res, next) ->
		{overleaf_id} = req.params
		ProjectListController._getUserProjects overleaf_id, (error, projects) ->
			return next(error) if error?
			res.json { projects: projects }
	
	_getUserProjects: (overleaf_id, callback = (error, projects) ->) ->
		User.findOne { 'overleaf.id': overleaf_id }, { _id: 1 }, (error, user) ->
			return callback(error) if error?
			return callback null, [] if !user?
			ProjectGetter.findAllUsersProjects user._id, { name: 1 }, (error, owned = [], shared = [], readOnly = []) ->
				return callback(error) if error?
				projects = []
				for project in owned
					projects.push ProjectListController._buildProjectView project, 'owner'
				for project in shared
					projects.push ProjectListController._buildProjectView project, 'readAndWrite'
				for project in readOnly
					projects.push ProjectListController._buildProjectView project, 'readOnly'
				return callback null, projects
	
	_buildProjectView: (project, accessLevel) ->
		return {
			id: project._id,
			title: project.name
		}