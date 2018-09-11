logger = require "logger-sharelatex"
settings = require "settings-sharelatex"
metrics = require "metrics-sharelatex"

mongojs = require "mongojs"
db = mongojs(settings.mongo.url, ["projectImportFailures"])

module.exports = ProjectImportErrorRecorder =
	record: (v1_project_id, v2_user_id, error, callback = (error) ->) ->
		_callback = (mongoError) ->
			if mongoError?
				logger.error {v1_project_id, mongoError}, "failed to change project status in mongo"
			callback(error || null)

		if error?
			errorRecord =
				v2_user_id: v2_user_id
				error: error.toString()
				stack: error.stack
				ts: new Date()
			logger.log {v1_project_id, errorRecord}, "recording failed attempt to process updates"
			db.projectImportFailures.update {
				v1_project_id: v1_project_id
			}, {
				$set: errorRecord
				$inc:
					attempts: 1
				$push:
					history:
						$each: [ errorRecord ]
						$position: 0
						$slice: 10 # only keep recent failures
			}, {
				upsert: true
			}, _callback
		else
			db.projectImportFailures.remove { v1_project_id: v1_project_id }, _callback

	getFailureRecord: (v1_project_id, callback = (error, failureRecord) ->) ->
		db.projectImportFailures.findOne {v1_project_id: v1_project_id}, {}, callback

	getFailedProjects: (callback = (error, failedProjects) ->) ->
		db.projectImportFailures.find {}, {}, (error, results) ->
			return callback(error) if error?
			callback(null, results)

	getFailuresByType: (callback = (error, failureCounts, failureAttempts) ->) ->
		db.projectImportFailures.find {}, {}, (error, results) ->
			return callback(error) if error?
			failureCounts = {}
			failureAttempts = {}
			# count all the failures and number of attempts by type
			for result in results or []
				failureType = result.error
				attempts = result.attempts || 1 # allow for field to be absent
				if failureCounts[failureType] > 0
					failureCounts[failureType]++
					failureAttempts[failureType] += attempts
				else
					failureCounts[failureType] = 1
					failureAttempts[failureType] = attempts
			callback(null, failureCounts, failureAttempts)

	getFailures: (callback = (error, results) ->) ->
		ProjectImportErrorRecorder.getFailuresByType (error, failureCounts, failureAttempts) ->
			return callback(error) if error?

			shortNames =
				'InvalidNameError: Project name cannot not contain / characters': 'invalid-name-slash'
				'*': 'other'

			# set all the known errors to zero if not present (otherwise gauges stay on their last value)
			summaryCounts = {}
			summaryAttempts = {}

			for failureType, label of shortNames
				summaryCounts[label] = 0
				summaryAttempts[label] = 0

			# record a metric for each type of failure
			for failureType, failureCount of failureCounts
				label = shortNames[failureType] || shortNames['*']
				summaryCounts[label] += failureCount
				summaryAttempts[label] += failureAttempts[failureType]

			for label, count of summaryCounts
				metrics.globalGauge? "project-import.failed.#{label}", count

			for label, attempts of summaryAttempts
				metrics.globalGauge? "project-import.attempts.#{label}", attempts

			callback(null, {counts: summaryCounts, attempts: summaryAttempts})

		ensureIndex: () ->
			# placeholder to remind us that we need to create the following index:R
			db.projectImportFailures.ensureIndex { v1_project_id: 1 }, { background: true }