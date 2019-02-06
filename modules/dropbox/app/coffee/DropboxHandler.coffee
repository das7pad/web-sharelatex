request = require('request')
settings = require('settings-sharelatex')
logger = require('logger-sharelatex')
ProjectGetter = require('../../../../app/js/Features/Project/ProjectGetter')
projectEntityHandler = require '../../../../app/js/Features/Project/ProjectEntityHandler'
_ = require('underscore')
async = require('async')

module.exports = DropboxHandler =

	getUserRegistrationStatus: (user_id, callback)->
		if !user_id?
			err = new Error("no user id passed to getUserRegistrationStatus")
			logger.err err
			return callback(err)		
		logger.log user_id:user_id, "getting dropbox registration status from tpds"
		opts =
			url : "#{settings.apis.thirdPartyDataStore.url}/user/#{user_id}/dropbox/status"
			timeout: 5000
		request.get opts, (err, response, body)->
			safelyGetResponse err, response, body, (err, body)->
				if err?
					logger.err err:err, response:response, "getUserRegistrationStatus problem"
					return callback err
				logger.log status:body, "getting dropbox registration status for user #{user_id}"
				callback err, body

	getDropboxRegisterUrl: (user_id, state, callback)->
		if !user_id?
			err = new Error("no user id passed to getDropboxRegisterUrl")
			logger.err err
			return callback(err)
		opts =
			url: "#{settings.apis.thirdPartyDataStore.url}/user/#{user_id}/dropbox/register"
			timeout: 5000
		if settings.apis.thirdPartyDataStore.dropboxApp?
			opts.qs = {app: settings.apis.thirdPartyDataStore.dropboxApp, state: state}
		request.get opts, (err, response, body)->
			safelyGetResponse err, response, body, (err, body)->
				if err?
					logger.err err:err, response:response, "getUserRegistrationStatus problem"
					return callback err
				url = body.authorize_url
				logger.log user_id:user_id, url:url, "starting dropbox register"
				callback err, url

	setAccessToken: (user_id, token, dropbox_uid, callback)->
		if !user_id?
			err = new Error("no user id passed to set access_token")
			logger.err err
			return callback(err)
		opts =
			url: "#{settings.apis.thirdPartyDataStore.url}/user/#{user_id}/dropbox/setaccesstoken"
			json:
				token:token
				dropbox_uid:dropbox_uid
			timeout: 5000
		logger.log user_id:user_id, "compleing dropbox registration"
		request.post opts, (err, response, body)=>
			if response.statusCode != 200 or err?
				logger.err err:err, response:response, "error setting dropbox access token"
				return callback err
			DropboxHandler.flushUsersProjectToDropbox user_id, callback

	unlinkAccount: (user_id, callback)->
		if !user_id?
			err = new Error("no user id passed to unlinkAccount")
			logger.err err
			return callback(err)
		opts =
			url: "#{settings.apis.thirdPartyDataStore.url}/user/#{user_id}/dropbox"
			timeout: 5000
		request.del opts, (err, response, body)=>
			callback(err)

	flushUsersProjectToDropbox: (user_id, callback)->
		if !user_id?
			err = new Error("no user id passed to flushUsersProjectToDropbox")
			logger.err err
			return callback(err)
		ProjectGetter.findAllUsersProjects user_id, '_id archived', (err, allProjects)->
			projectList = []
			projectList = projectList.concat(allProjects.owned || [])
			projectList = projectList.concat(allProjects.readAndWrite || [])
			projectList = projectList.concat(allProjects.readOnly || [])
			projectList = _.filter projectList, (project)-> project?.archived != true
			projectIds = _.pluck(projectList, "_id")
			logger.log projectIds:projectIds, user_id:user_id, "flushing all a users projects to tpds"
			jobs = projectIds.map (project_id)->
				return (cb)->
					projectEntityHandler.flushProjectToThirdPartyDataStore project_id, (err)->
						if err?
							logger.err err:err, project_id:project_id, user_id:user_id, "error flushing project to dropbox for first time"
						cb() #process all projects even if 1 of them errored
			async.series jobs, callback

safelyGetResponse = (err, res, body, callback)->
	statusCode =  if res? then res.statusCode else 500
	if err? or statusCode != 200
		e = new Error("something went wrong getting response from dropbox, #{err}, #{statusCode}")
		logger.err err:err
		callback(e, [])
	else
		body = JSON.parse body
		callback(null, body)
