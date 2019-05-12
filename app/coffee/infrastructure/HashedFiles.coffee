async = require "async"
crypto = require 'crypto'
fs = require "fs"
logger = require 'logger-sharelatex'
Path = require 'path'
Modules = require "./Modules"
Settings = require('settings-sharelatex')

hashedFiles = {}

if !Settings.useMinifiedJs
	logger.log "not using minified JS, not hashing static files"
	if !module.parent
		process.exit(0)

else
	logger.log "Generating file hashes..."

	pathList = [
		"/minjs/libs/require.js"
		"/minjs/ide.js"
		"/minjs/main.js"
		"/minjs/libraries.js"
		"/stylesheets/style.css"
		"/stylesheets/light-style.css"
		"/stylesheets/ieee-style.css"
		"/stylesheets/sl-style.css"
	].concat(Modules.moduleAssetFiles('/minjs/'))

	getFileContent = (path, candidate) ->
		filePath = Path.join __dirname, "../../../", "public", candidate
		exists = fs.existsSync filePath
		if exists
			content = fs.readFileSync filePath, "UTF-8"
			return content
		else
			logger.log {filePath:filePath, path:path}, "file does not exist for hashing"
			return ""

	generate_hash = (path, done) ->
		logger.log path:path, "Started hashing static content"
		content = getFileContent path, path
		if !content
			content = getFileContent path, path.replace('minjs', 'js')
			if !content
				logger.err path:path, "No source candidate available"
				if !module.parent
					process.exit(1)

		hash = crypto.createHash("md5").update(content).digest("hex")

		splitPath = path.split("/")
		filenameSplit = splitPath.pop().split(".")
		filenameSplit.splice(filenameSplit.length-1, 0, hash)
		splitPath.push(filenameSplit.join("."))

		hashPath = splitPath.join("/")
		hashedFiles[path] = hashPath

		fsHashPath = Path.join __dirname, "../../../", "public", hashPath

		fs.stat fsHashPath, (err) ->
			if err?.code is 'ENOENT'
				fs.writeFileSync(fsHashPath, content)
			logger.log path:path, "Finished hashing static content"
			done()

	async.map pathList, generate_hash, () ->
		logger.log "Finished hashing static content"
		if !module.parent
			process.exit(0)

module.exports = hashedFiles
