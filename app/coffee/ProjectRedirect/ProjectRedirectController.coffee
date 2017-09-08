{Project} = require "../../../../../app/js/models/Project"
ErrorController = require "../../../../../app/js/Features/Errors/ErrorController"
logger = require 'logger-sharelatex'

module.exports = ProjectRedirectController =
	redirectDocByToken: (req, res, next) ->
		{token} = req.params
		if !token?
			return res.sendStatus 400
		logger.log { token }, 'redirecting to project from token'
		Project.findOne { 'overleaf.token': token }, { _id: 1 }, (error, project) ->
			return next(error) if error?
			if !project?
				return ErrorController.notFound(req, res)
			else
				res.redirect "/project/#{project._id}"

	redirectDocByReadToken: (req, res, next) ->
		{read_token} = req.params
		if !read_token?
			return res.sendStatus 400
		logger.log { read_token }, 'redirecting to project from read_token'
		Project.findOne { 'overleaf.read_token': read_token }, { _id: 1 }, (error, project) ->
			return next(error) if error?
			if !project?
				return ErrorController.notFound(req, res)
			else
				res.redirect "/project/#{project._id}"