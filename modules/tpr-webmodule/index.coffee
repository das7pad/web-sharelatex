ReferencesRouter = require "./app/js/ReferencesRouter"

module.exports = References =
	router: ReferencesRouter

	viewIncludes:
		"userSettings"                      : "user/_settings"
		"newFileModal:selector"             : "project/editor/_new-file-modal-selector"
		"newFileModal:panel"                : "project/editor/_new_file-modal-panel"
		"binaryFile:linkedFileInfo"         : "project/editor/_binary_file_linked_file_info"
		"binaryFile:linkedFileRefreshError" : "project/editor/_binary_file_linked_file_refresh_error"

	linkedFileAgents:
		"mendeley": () -> require('./app/js/LinkedFiles/MendeleyAgent')
		"zotero": () -> require('./app/js/LinkedFiles/ZoteroAgent')
