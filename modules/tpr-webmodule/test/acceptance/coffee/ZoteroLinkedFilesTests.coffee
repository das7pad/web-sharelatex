async = require "async"
expect = require("chai").expect
_ = require 'underscore'
mkdirp = require "mkdirp"
Settings = require "settings-sharelatex"
express = require("express")

basePath = "../../../../.."
request = require "#{basePath}/test/acceptance/js/helpers/request"
User = require "#{basePath}/test/acceptance/js/helpers/User"

MockTPRApi = require "./helpers/MockTPRApi"
MockFilestoreApi = require "./helpers/MockFilestoreApi"

describe "ZoteroLinkedFiles", ->
	before (done) ->
		async.series [
			(cb) =>
				# Set up a project owner with fully upgraded features
				@owner = new User()
				@owner.login (err) =>
					return cb(err) if err?
					@owner.upgradeFeatures (err) =>
						cb(err)

			(cb) =>
				# Set up a second user with default features
				@other_user_one = new User()
				@other_user_one.login (err) =>
					return cb(err) if err?
					@other_user_one.downgradeFeatures (err) =>
						cb(err)

			(cb) =>
				# Create a project
				@owner.createProject 'zotero-test-one', {template: 'blank'}, (err, project_id) =>
					@project_one_id = project_id
					@owner.getProject project_id, (err, project) =>
						return cb(err) if err?
						@project_one_root_folder_id = project.rootFolder[0]._id.toString()
						cb(err)

			(cb) =>
				# Create another project
				@owner.createProject 'zotero-test-two', {template: 'blank'}, (err, project_id) =>
					@project_two_id = project_id
					@owner.getProject project_id, (err, project) =>
						return cb(err) if err?
						@project_two_root_folder_id = project.rootFolder[0]._id.toString()
						cb(err)

			(cb) =>
				# Add other user as collaborator
				@owner.addUserToProject @project_one_id, @other_user_one, 'readAndWrite', (err) =>
					@owner.addUserToProject @project_two_id, @other_user_one, 'readAndWrite', (err) =>
						cb(err)

		], done

	beforeEach (done) ->
		done()

	describe "Importing bibtex from zotero account into a linked file", ->
		beforeEach ->
			MockTPRApi.reset()

		describe "when the user doesn't have the zotero feature", ->
			before ->

			it "should produce an error", (done) ->
				@other_user_one.request.post {
					url: "/project/#{@project_one_id}/linked_file",
					json:
						name: 'test.bib',
						parent_folder_id: @project_one_root_folder_id,
						provider: 'zotero',
						data: {}
				}, (error, response, body) =>
					expect(response.statusCode).to.equal 400
					expect(body).to.equal "This feature is not enabled on your account"
					done()

		it "should import the file", (done) ->
			@owner.request.post {
				url: "/project/#{@project_one_id}/linked_file",
				json:
					name: 'test.bib',
					parent_folder_id: @project_one_root_folder_id,
					provider: 'zotero',
					data: {}
			}, (error, response, body) =>
				new_file_id = body.new_file_id
				@existing_file_id = new_file_id
				expect(new_file_id).to.exist
				@owner.getProject @project_one_id, (error, project) =>
					return done(error) if error?
					firstFile = project.rootFolder[0].fileRefs[0]
					expect(firstFile._id.toString()).to.equal(new_file_id.toString())
					expect(firstFile.linkedFileData).to.deep.equal {
						format: 'bibtex'
						provider: 'zotero',
						importer_id: @owner._id.toString()
					}
					expect(firstFile.name).to.equal('test.bib')
					done()

		it "should import the file when multiple requests are needed", (done) ->
			MockTPRApi.reset(zotero: bibtex: ["page one\n", "page two", ''])
			@owner.request.post {
				url: "/project/#{@project_one_id}/linked_file",
				json:
					name: 'test.bib',
					parent_folder_id: @project_one_root_folder_id,
					provider: 'zotero',
					data: {}
			}, (error, response, body) =>
				new_file_id = body.new_file_id
				@existing_file_id = new_file_id
				expect(new_file_id).to.exist
				@owner.getProject @project_one_id, (error, project) =>
					return done(error) if error?
					firstFile = project.rootFolder[0].fileRefs[0]
					expect(firstFile._id.toString()).to.equal(new_file_id.toString())
					expect(firstFile.linkedFileData).to.deep.equal {
						format: 'bibtex'
						provider: 'zotero',
						importer_id: @owner._id.toString()
					}
					expect(firstFile.name).to.equal('test.bib')
					expect(MockFilestoreApi.getFile(@project_one_id, new_file_id)).to.equal(
						"page one\npage two"
					)
					done()

		it "should import the file with biblatex format", (done) ->
			@owner.request.post {
				url: "/project/#{@project_one_id}/linked_file",
				json:
					name: 'test.bib',
					parent_folder_id: @project_one_root_folder_id,
					provider: 'zotero',
					data: {
						format: 'biblatex'
					}
			}, (error, response, body) =>
				new_file_id = body.new_file_id
				@existing_file_id = new_file_id
				expect(new_file_id).to.exist
				@owner.getProject @project_one_id, (error, project) =>
					return done(error) if error?
					firstFile = project.rootFolder[0].fileRefs[0]
					expect(firstFile._id.toString()).to.equal(new_file_id.toString())
					expect(firstFile.linkedFileData).to.deep.equal {
						format: 'biblatex'
						provider: 'zotero',
						importer_id: @owner._id.toString()
					}
					expect(firstFile.name).to.equal('test.bib')
					expect(MockFilestoreApi.getFile(@project_one_id, new_file_id)).to.equal(
						'{testBiblatex: 1}'
					)
					done()

		it "should not refresh the file for another user", (done) ->
			@other_user_one.request.post {
				url: "/project/#{@project_one_id}/linked_file/#{@existing_file_id}/refresh",
				json: true
			}, (error, response, body) =>
				expect(error).to.not.exist
				expect(response.statusCode).to.equal 400
				expect(body).to.equal "You are not the user who originally imported this file"
				done()

		it "should refresh the file", (done) ->
			@owner.request.post {
				url: "/project/#{@project_one_id}/linked_file/#{@existing_file_id}/refresh",
				json: true
			}, (error, response, body) =>
				new_file_id = body.new_file_id
				expect(new_file_id).to.exist
				expect(new_file_id).to.not.equal @existing_file_id
				@refreshed_file_id = new_file_id
				@owner.getProject @project_one_id, (error, project) =>
					return done(error) if error?
					firstFile = project.rootFolder[0].fileRefs[0]
					expect(firstFile._id.toString()).to.equal(new_file_id.toString())
					expect(firstFile.name).to.equal('test.bib')
					done()

		describe "when tpr produces an error", ->
			beforeEach ->
				MockTPRApi.reset(shouldError: true)
			afterEach ->
				MockTPRApi.reset()

			it "should not import the file", (done) ->
				@owner.request.post {
					url: "/project/#{@project_one_id}/linked_file",
					json:
						name: 'test.bib',
						parent_folder_id: @project_one_root_folder_id,
						provider: 'zotero',
						data: {}
				}, (error, response, body) =>
					expect(response.statusCode).to.equal 502
					expect(body).to.equal "The remote service produced an error"
					done()

	describe "Refreshing a zotero file from v1", ->
		before (done) ->
			@owner.createProject 'zotero-test-three', {template: 'blank'}, (err, project_id) =>
				@project_three_id = project_id
				@owner.getProject project_id, (err, project) =>
					return done(err) if err?
					@project_three = project
					@project_three_root_folder_id = project.rootFolder[0]._id.toString()
					@project_three.rootFolder[0].fileRefs.push {
						linkedFileData: {
							provider: "zotero",
							v1_importer_id: 99298
						},
						_id: "5b3b5b631ac80a000162562c",
						rev: 0,
						created: new Date(),
						name: "zotero.bib"
					}
					@owner.saveProject @project_three, (err) =>
						return done(err) if err?
						@owner.addUserToProject @project_three._id, @other_user_one, 'readAndWrite', (err) =>
							return done(err) if err?
							@owner.mongoUpdate {$set: {overleaf: {id: 99298}}}, done

		describe "when the user is not the original v1 importer", ->
			it "should not refresh the file", (done) ->
				@other_user_one.request.post {
					url: "/project/#{@project_three_id}/linked_file/5b3b5b631ac80a000162562c/refresh",
					json: true
				}, (error, response, body) =>
					expect(response.statusCode).to.equal 400
					expect(body).to.equal "You are not the user who originally imported this file"
					done()

		describe "when the user is the original v1 importer", ->

			it "should refresh the file", (done) ->
				@owner.request.post {
					url: "/project/#{@project_three_id}/linked_file/5b3b5b631ac80a000162562c/refresh",
					json: true
				}, (error, response, body) =>
					expect(response.statusCode).to.equal 200
					new_file_id = body.new_file_id
					expect(new_file_id).to.exist
					done()

	describe "Refreshing an orphaned zotero file from v1", ->
		before (done) ->
			@owner.createProject 'zotero-test-four', {template: 'blank'}, (err, project_id) =>
				@project_four_id = project_id
				@owner.getProject project_id, (err, project) =>
					return done(err) if err?
					@project_four = project
					@project_four_root_folder_id = project.rootFolder[0]._id.toString()
					@project_four.rootFolder[0].fileRefs.push {
						linkedFileData: {
							provider: "zotero"  # Note, no importer id
						},
						_id: "5b3b5b631ac80a000162562d",
						rev: 0,
						created: new Date(),
						name: "zotero.bib"
					}
					@owner.saveProject @project_four, (err) =>
						return done(err) if err?
						@owner.addUserToProject @project_four._id, @other_user_one, 'readAndWrite', (err) =>
							return done(err) if err?
							@owner.mongoUpdate {$set: {overleaf: {id: 99299}}}, done

		describe "when the user tries to refresh the file", ->
			it "should not refresh the file", (done) ->
				@owner.request.post {
					url: "/project/#{@project_four_id}/linked_file/5b3b5b631ac80a000162562d/refresh",
					json: true
				}, (error, response, body) =>
					expect(response.statusCode).to.equal 400
					expect(body).to.equal "This file cannot be refreshed"
					done()
