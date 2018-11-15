logger = require "logger-sharelatex"
settings = require "settings-sharelatex"
metrics = require "metrics-sharelatex"

mongojs = require "mongojs"
db = mongojs(settings.mongo.url, ["projectImportFailures"])

module.exports = ProjectImportErrorRecorder =
	record: (v1_project_id, v2_user_id, error, callback = (error) ->) ->
		_callback = (mongoError, result...) ->
			if mongoError?
				logger.error {v1_project_id, mongoError}, "failed to change project status in mongo"
			callback(error || null, result...)

		if error?
			errorRecord =
				v2_user_id: v2_user_id
				error: error.toString()
				stack: error.stack
				ts: new Date()
			logger.log {v1_project_id, errorRecord}, "recording failed attempt to import project"
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
		db.projectImportFailures.find {}, {error:1, attempts:1}, (error, results) ->
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
				'InvalidNameError: Project name cannot contain / characters': 'invalid-name-slash'
				'InvalidNameError: Project name is too long': 'invalid-name-length'
				"UnsupportedFileTypeError: expected file.agent to be valid, instead got 'plotly'": 'plotly'
				"UnsupportedFileTypeError: expected file.agent to be valid, instead got 'zotero'": 'zotero'
				"UnsupportedFileTypeError: expected file.agent to be valid, instead got 'citeulike'": 'citeulike'
				"V2ExportNotInProgress: v2 export not in progress": 'v2-export-not-in-progress'
				"V1HistoryNotSyncedError: v1 history not synced": 'v1-history-not-synced'
				"UnsupportedExportRecordsError: project has export records": 'has-export-records'
				'Error: non-ok response from filestore for upload: 500' : 'filestore-500'
				'Error: non-ok response from filestore for upload: 502' : 'filestore-502'
				'Error: non-ok response from filestore for upload: 413' : 'filestore-413'
				'Error: socket hang up': 'connection-error'
				'Error: ETIMEDOUT': 'timed-out'
				'Error: read ECONNRESET': 'connection-error'
				'Error: overleaf returned non-success code: 403': 'overleaf-403'
				'Error: non-ok response from filestore for upload: 502': 'filestore-502'
				'V2ExportInProgress: v2 export already in progress': 'v2-export-already-in-progress'
				'InvalidNameError: file already exists': 'file-exists'
				'InvalidNameError: invalid element name': 'invalid-element-name'
				'Error: Overleaf s3 returned non-success code: 500': 'overleaf-s3-500'
				'Error: overleaf returned non-success code: 500': 'overleaf-500'
				'Error: ESOCKETTIMEDOUT': 'connection-error'
				'NotFoundError: entity not found': 'entity-not-found'
				'Error: project-history returned non-success code: 409': 'project-history-409'
				'Error: project-history returned non-success code: 502': 'project-history-502'
				'Error: project-history returned non-success code: 503': 'project-history-503'
				'Error: docstore api responded with non-success code: 500': 'docstore-500'
				'Error: docstore api responded with non-success code: 504': 'docstore-504'
				'Error: connect ETIMEDOUT 52.216.18.59:443': 'connection-error'
				'Error: cannot import label with no history_version': 'label-without-version'
				'Error: tried to release timed out lock': 'lock-error'
				'Error: export of assignments is not supported': 'assignments-not-supported'
				'V1ProjectHasAssignments: export of assignments is not supported': 'assignments-not-supported'
				'*': 'other'

			getShortName = (name) ->
				if shortNames[name]
					return shortNames[name] 
				if name?.match(/UnsupportedBrandError: project has brand variation/)
					return 'unsupported-brand'
				if name?.match(/duplicate key error/)
					return 'duplicate-key'
				if name?.match(/InvalidNameError: Project name cannot( not)? contain/)
					return 'invalid-name-other'
				if name?.match(/overleaf returned non-success code: 500/)
					return 'overleaf-500'
				if name?.match(/overleaf returned non-success code: 403/)
					return 'overleaf-403'
				if name?.match(/NotFoundError: no project found with id/)
					return 'project-not-found'
				return shortNames['*']

			# set all the known errors to zero if not present (otherwise gauges stay on their last value)
			summaryCounts = {}
			summaryAttempts = {}

			for failureType, label of shortNames
				summaryCounts[label] = 0
				summaryAttempts[label] = 0

			# record a metric for each type of failure
			for failureType, failureCount of failureCounts
				label = getShortName(failureType)
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