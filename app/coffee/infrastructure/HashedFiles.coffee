# This file was auto-generated, do not edit it directly.
# Instead run bin/update_build_scripts from
# https://github.com/das7pad/sharelatex-dev-env

async = require "async"
crypto = require "crypto"
fs = require "fs"
Path = require "path"

logger = require "logger-sharelatex"

REPOSITORY_ROOT = Path.join __dirname, "../../../"
module.exports = hashedFiles = {}

fillHashedFiles = () ->
	pathList = [
		"/minjs/libs/require.js"
		"/minjs/ide.js"
		"/minjs/main.js"
		"/minjs/libraries.js"
		"/stylesheets/style.css"
		"/stylesheets/light-style.css"
		"/stylesheets/ieee-style.css"
		"/stylesheets/sl-style.css"
	]

	modulesPath = Path.join REPOSITORY_ROOT, "modules"
	for moduleName in fs.readdirSync(modulesPath)
		index = Path.join(modulesPath, moduleName, "index.js")
		content = fs.readFileSync(index, "utf-8")
		filesMatch = /assetFiles: \[(.+)\]/.exec(content)
		if not filesMatch
			continue
		for file in filesMatch[1].split(",")
			pathList.push(Path.join "/minjs", /['"](.+)['"]/.exec(file)[1])

	md5 = (path) ->
		buffer = fs.readFileSync path
		return crypto.createHash("md5").update(buffer).digest("hex")

	generateHash = (path, done) ->
		fsPath = Path.join REPOSITORY_ROOT, "public", path

		hash = md5(fsPath)

		extension = Path.extname(path)
		filename = Path.basename(path, extension)
		params = {
			dir: Path.dirname(path),
			name: "#{filename}.#{hash}",
			ext: extension
		}
		hashPath = Path.format(params)
		hashedFiles[path] = hashPath

		fsHashPath = Path.join REPOSITORY_ROOT, "public", hashPath

		fs.stat fsHashPath, (err) ->
			if not err?
				logger.log path:path, "Nothing to do"
				return done()

			if err?.code is "ENOENT"
				logger.log path:path, "Creating symlink"
				return fs.copyFile fsPath, fsHashPath, (err) ->
					if err?
						logger.log path:path, "Creating symlink failed", err
					done()
			logger.log {path:path, err:err}, "Calling stat failed"
			done()

	logger.log "Started hashing static content"
	async.map pathList, generateHash, () ->
		logger.log "Finished hashing static content"

invokedDirectly = !module.parent
if invokedDirectly or require("settings-sharelatex").useMinifiedJs
	fillHashedFiles()
