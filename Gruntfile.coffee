fs = require "fs"
PackageVersions = require "./app/coffee/infrastructure/PackageVersions"
Settings = require "settings-sharelatex"
require('es6-promise').polyfill()

module.exports = (grunt) ->
	grunt.loadNpmTasks 'grunt-available-tasks'
	grunt.loadNpmTasks 'grunt-contrib-requirejs'
	grunt.loadNpmTasks 'grunt-git-rev-parse'
	grunt.loadNpmTasks 'grunt-file-append'

	config =

		requirejs:
			compile:
				options:
					optimize:"uglify2"
					uglify2:
						mangle: false
					appDir: "public/js"
					baseUrl: "./"
					dir: "public/minjs"
					inlineText: false
					generateSourceMaps: true
					preserveLicenseComments: false
					paths:
						"moment": "libs/#{PackageVersions.lib('moment')}"
						"mathjax": "/js/libs/mathjax/MathJax.js?config=TeX-AMS_HTML"
						"pdfjs-dist/build/pdf": "libs/#{PackageVersions.lib('pdfjs')}/pdf"
						"ace": "#{PackageVersions.lib('ace')}"
						"fineuploader": "libs/#{PackageVersions.lib('fineuploader')}"
					shim:
						"pdfjs-dist/build/pdf":
							deps: ["libs/#{PackageVersions.lib('pdfjs')}/compatibility"]

					skipDirOptimize: true
					modules: [
						{
							name: "main",
							exclude: ["libraries"]
						}, {
							name: "ide",
							exclude: ["pdfjs-dist/build/pdf", "libraries"]
						},{
							name: "libraries"
						},{
							name: "ace/mode-latex"
						},{
							name: "ace/worker-latex"
						}

					]

		"git-rev-parse":
			version:
				options:
					prop: 'commit'


		file_append:
			default_options: files: [ {
				append: '\n//ide.js is complete - used for automated testing'
				input: 'public/minjs/ide.js'
				output: 'public/minjs/ide.js'
			}]

		sed:
			version:
				path: "app/views/sentry.pug"
				pattern: '@@COMMIT@@',
				replacement: '<%= commit %>',
			release:
				path: "app/views/sentry.pug"
				pattern: "@@RELEASE@@"
				replacement: process.env.BUILD_NUMBER || "(unknown build)"

	grunt.initConfig config
	grunt.registerTask 'compile:minify', 'Concat and minify the client side js', ['requirejs', "file_append"]
	grunt.registerTask 'version', "Write the version number into sentry.pug", ['git-rev-parse', 'sed']

