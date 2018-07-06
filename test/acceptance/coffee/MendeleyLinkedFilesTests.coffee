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


describe "MendeleyLinkedFiles", ->
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
				@owner.createProject 'mendeley-test-one', {template: 'blank'}, (err, project_id) =>
					@project_one_id = project_id
					@owner.getProject project_id, (err, project) =>
						return cb(err) if err?
						@project_one_root_folder_id = project.rootFolder[0]._id.toString()
						cb(err)

			(cb) =>
				# Create another project
				@owner.createProject 'mendeley-test-two', {template: 'blank'}, (err, project_id) =>
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

	describe "Getting list of users groups from TPR (Third Party References)", ->
		beforeEach ->
			MockTPRApi.reset(groups: [{id: 'abcd', name: 'Test Group'}])

		it "should get a list of the users mendeley groups", (done) ->
			@owner.request.get {uri: '/mendeley/groups', json: true}, (err, response, body) =>
				expect(err).to.not.exist
				expect(body).to.deep.equal {
					user_id: @owner._id.toString(),
					groups: [{id: 'abcd', name: 'Test Group'}]
				}
				done()

		describe "when the user does not have the mendeley feature", ->

			it "should not produce an list of groups", (done) ->
				@other_user_one.request.get {uri: '/mendeley/groups', json: true}, (err, response, body) =>
					expect(err).to.not.exist
					expect(response.statusCode).to.equal 403
					expect(body).to.equal "Forbidden"
					done()

	describe "Importing bibtex from mendeley account into a linked file", ->
		beforeEach ->
			MockTPRApi.reset()

		describe "when the user doesn't have the mendeley feature", ->
			before ->

			it "should produce an error", (done) ->
				@other_user_one.request.post {
					url: "/project/#{@project_one_id}/linked_file",
					json:
						name: 'test.bib',
						parent_folder_id: @project_one_root_folder_id,
						provider: 'mendeley',
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
					provider: 'mendeley',
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
						provider: 'mendeley',
						importer_id: @owner._id.toString()
					}
					expect(firstFile.name).to.equal('test.bib')
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

			it "should not import the file", (done) ->
				MockTPRApi.reset(shouldError: true)
				@owner.request.post {
					url: "/project/#{@project_one_id}/linked_file",
					json:
						name: 'test.bib',
						parent_folder_id: @project_one_root_folder_id,
						provider: 'mendeley',
						data: {}
				}, (error, response, body) =>
					expect(response.statusCode).to.equal 502
					expect(body).to.equal "The remote service produced an error"
					done()


	describe "Importing bibtex from mendeley group into a linked file", ->
		before ->
			MockTPRApi.reset(groups: [{id: 'abcd', name: 'Test Group'}])

		describe "when the user doesn't have the mendeley feature", ->
			before ->

			it "should produce an error", (done) ->
				@other_user_one.request.post {
					url: "/project/#{@project_two_id}/linked_file",
					json:
						name: 'test.bib',
						parent_folder_id: @project_two_root_folder_id,
						provider: 'mendeley',
						data: {group_id: 'abcd'}
				}, (error, response, body) =>
					expect(response.statusCode).to.equal 400
					expect(body).to.equal "This feature is not enabled on your account"
					done()

		it "should import the file", (done) ->
			@owner.request.post {
				url: "/project/#{@project_two_id}/linked_file",
				json:
					name: 'test.bib',
					parent_folder_id: @project_two_root_folder_id,
					provider: 'mendeley',
					data: {group_id: 'abcd'}
			}, (error, response, body) =>
				new_file_id = body.new_file_id
				@existing_file_id = new_file_id
				expect(new_file_id).to.exist
				@owner.getProject @project_two_id, (error, project) =>
					return done(error) if error?
					firstFile = project.rootFolder[0].fileRefs[0]
					expect(firstFile._id.toString()).to.equal(new_file_id.toString())
					expect(firstFile.linkedFileData).to.deep.equal {
						provider: 'mendeley',
						group_id: 'abcd',
						importer_id: @owner._id.toString()
					}
					expect(firstFile.name).to.equal('test.bib')
					done()

		it "should not refresh the file for another user", (done) ->
			@other_user_one.request.post {
				url: "/project/#{@project_two_id}/linked_file/#{@existing_file_id}/refresh",
				json: true
			}, (error, response, body) =>
				expect(error).to.not.exist
				expect(response.statusCode).to.equal 400
				expect(body).to.equal "You are not the user who originally imported this file"
				done()

		it "should refresh the file", (done) ->
			@owner.request.post {
				url: "/project/#{@project_two_id}/linked_file/#{@existing_file_id}/refresh",
				json: true
			}, (error, response, body) =>
				new_file_id = body.new_file_id
				expect(new_file_id).to.exist
				expect(new_file_id).to.not.equal @existing_file_id
				@refreshed_file_id = new_file_id
				@owner.getProject @project_two_id, (error, project) =>
					return done(error) if error?
					firstFile = project.rootFolder[0].fileRefs[0]
					expect(firstFile._id.toString()).to.equal(new_file_id.toString())
					expect(firstFile.name).to.equal('test.bib')
					done()


	describe "Refreshing a mendeley file from v1", ->
		before (done) ->
			@owner.createProject 'mendeley-test-three', {template: 'blank'}, (err, project_id) =>
				@project_three_id = project_id
				@owner.getProject project_id, (err, project) =>
					return done(err) if err?
					@project_three = project
					@project_three_root_folder_id = project.rootFolder[0]._id.toString()
					@project_three.rootFolder[0].fileRefs.push {
						linkedFileData: {
							provider: "mendeley",
							v1_importer_id: 99299
						},
						_id: "5b3b5b631ac80a000162562c",
						rev: 0,
						created: new Date(),
						name: "mendeley.bib"
					}
					@owner.saveProject @project_three, (err) =>
						return done(err) if err?
						@owner.addUserToProject @project_three._id, @other_user_one, 'readAndWrite', (err) =>
							return done(err) if err?
							@owner.mongoUpdate {$set: {overleaf: {id: 99299}}}, done

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

	describe "Refreshing an orphaned mendeley file from v1", ->
		before (done) ->
			@owner.createProject 'mendeley-test-four', {template: 'blank'}, (err, project_id) =>
				@project_four_id = project_id
				@owner.getProject project_id, (err, project) =>
					return done(err) if err?
					@project_four = project
					@project_four_root_folder_id = project.rootFolder[0]._id.toString()
					@project_four.rootFolder[0].fileRefs.push {
						linkedFileData: {
							provider: "mendeley"  # Note, no importer id
						},
						_id: "5b3b5b631ac80a000162562d",
						rev: 0,
						created: new Date(),
						name: "mendeley.bib"
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
