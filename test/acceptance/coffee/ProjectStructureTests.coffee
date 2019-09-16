async = require "async"
expect = require("chai").expect
mkdirp = require "mkdirp"
ObjectId = require("mongojs").ObjectId
Path = require "path"
fs = require "fs"
Settings = require "settings-sharelatex"
_ = require "underscore"

ProjectGetter = require "../../../app/js/Features/Project/ProjectGetter"

MockDocUpdaterApi = require './helpers/MockDocUpdaterApi'
MockFileStoreApi = require './helpers/MockFileStoreApi'
MockProjectHistoryApi = require './helpers/MockProjectHistoryApi'
request = require "./helpers/request"
User = require "./helpers/User"

describe "ProjectStructureChanges", ->
	@timeout(5000)

	example_project_id = null
	example_doc_id = null
	example_file_id = null
	example_folder_id_1 = null
	example_folder_id_2 = null

	before (done) ->
		@owner = new User()
		@owner.login done

	describe "creating a project from the example template", ->
		before (done) ->
			MockDocUpdaterApi.clearProjectStructureUpdates()
			@owner.createProject "example-project", {template: "example"}, (error, project_id) =>
				throw error if error?
				example_project_id = project_id
				done()

		it "should version creating a doc", ->
			{docUpdates: updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
			expect(updates.length).to.equal(2)
			_.each updates, (update) =>
				expect(update.userId).to.equal(@owner._id)
				expect(update.docLines).to.be.a('string')
			expect(_.where(updates, pathname: "/main.tex").length).to.equal 1
			expect(_.where(updates, pathname: "/references.bib").length).to.equal 1
			expect(version).to.equal(3)

		it "should version creating a file", ->
			{fileUpdates: updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
			expect(updates.length).to.equal(1)
			update = updates[0]
			expect(update.userId).to.equal(@owner._id)
			expect(update.pathname).to.equal("/universe.jpg")
			expect(update.url).to.be.a('string');
			expect(version).to.equal(3)

	describe "duplicating a project", ->
		before (done) ->
			MockDocUpdaterApi.clearProjectStructureUpdates()
			@owner.request.post {
				uri: "/Project/#{example_project_id}/clone",
				json:
					projectName: 'new.tex'
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to add doc #{res.statusCode}")
				@dup_project_id = body.project_id
				done()

		it "should version the docs created", ->
			{docUpdates: updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(@dup_project_id)
			expect(updates.length).to.equal(2)
			_.each updates, (update) =>
				expect(update.userId).to.equal(@owner._id)
				expect(update.docLines).to.be.a('string')
			expect(_.where(updates, pathname: "/main.tex").length).to.equal(1)
			expect(_.where(updates, pathname: "/references.bib").length).to.equal(1)
			expect(version).to.equal(3)

		it "should version the files created", ->
			{fileUpdates: updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(@dup_project_id)
			expect(updates.length).to.equal(1)
			update = updates[0]
			expect(update.userId).to.equal(@owner._id)
			expect(update.pathname).to.equal("/universe.jpg")
			expect(update.url).to.be.a('string');
			expect(version).to.equal(3)

	describe "adding a doc", ->
		before (done) ->
			MockDocUpdaterApi.clearProjectStructureUpdates()

			ProjectGetter.getProject example_project_id, (error, project) =>
				throw error if error?
				@project_0 = project
				@owner.request.post {
					uri: "project/#{example_project_id}/doc",
					json:
						name: 'new.tex'
						parent_folder_id: project.rootFolder[0]._id
				}, (error, res, body) =>
					throw error if error?
					if res.statusCode < 200 || res.statusCode >= 300
						throw new Error("failed to add doc #{res.statusCode}")
					example_doc_id = body._id
					ProjectGetter.getProject example_project_id, (error, newProject) =>
						throw error if error?
						@project_1 = newProject
						done()

		it "should version the doc added", ->
			{docUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
			expect(updates.length).to.equal(1)
			update = updates[0]
			expect(update.userId).to.equal(@owner._id)
			expect(update.pathname).to.equal("/new.tex")
			expect(update.docLines).to.be.a('string');
			expect(version).to.equal(@project_0.version + 1)

		it "should increment the project structure version number", ->
			expect(@project_1.version).to.equal(@project_0.version + 1)

	describe "uploading a project", ->
		before (done) ->
			MockDocUpdaterApi.clearProjectStructureUpdates()

			zip_file = fs.createReadStream(Path.resolve(__dirname + '/../files/test_project.zip'))
			@test_project_name = 'wombat'

			req = @owner.request.post {
				uri: "project/new/upload",
				formData:
					qqfile: zip_file
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to upload project #{res.statusCode}")
				@uploaded_project_id = JSON.parse(body).project_id
				done()

		it "should version the docs created", ->
			{docUpdates: updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(@uploaded_project_id)
			expect(updates.length).to.equal(1)
			update = updates[0]
			expect(update.userId).to.equal(@owner._id)
			expect(update.pathname).to.equal("/main.tex")
			expect(update.docLines).to.equal("Test")
			expect(version).to.equal(2)

		it "should version the files created", ->
			{fileUpdates: updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(@uploaded_project_id)
			expect(updates.length).to.equal(1)
			update = updates[0]
			expect(update.userId).to.equal(@owner._id)
			expect(update.pathname).to.equal("/1pixel.png")
			expect(update.url).to.be.a('string');
			expect(version).to.equal(2)

	describe "uploading a project with a name", ->
		before (done) ->
			MockDocUpdaterApi.clearProjectStructureUpdates()

			zip_file = fs.createReadStream(Path.resolve(__dirname + '/../files/test_project_with_name.zip'))
			@test_project_name = 'wombat'

			req = @owner.request.post {
				uri: "project/new/upload",
				formData:
					qqfile: zip_file
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to upload project #{res.statusCode}")
				@uploaded_project_id = JSON.parse(body).project_id
				done()

		it "should set the project name from the zip contents", (done) ->
			ProjectGetter.getProject @uploaded_project_id, (error, project) =>
				expect(error).not.to.exist
				expect(project.name).to.equal @test_project_name
				done()

	describe "uploading a project with an invalid name", ->
		before (done) ->
			MockDocUpdaterApi.clearProjectStructureUpdates()

			zip_file = fs.createReadStream(Path.resolve(__dirname + '/../files/test_project_with_invalid_name.zip'))
			@test_project_match = /^bad[^\\]+name$/

			req = @owner.request.post {
				uri: "project/new/upload",
				formData:
					qqfile: zip_file
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to upload project #{res.statusCode}")
				@uploaded_project_id = JSON.parse(body).project_id
				done()

		it "should set the project name from the zip contents", (done) ->
			ProjectGetter.getProject @uploaded_project_id, (error, project) =>
				expect(error).not.to.exist
				expect(project.name).to.match @test_project_match
				done()

	describe "uploading a project with a shared top-level folder", ->
		before (done) ->
			MockDocUpdaterApi.clearProjectStructureUpdates()

			zip_file = fs.createReadStream(Path.resolve(__dirname + '/../files/test_project_with_shared_top_level_folder.zip'))

			@owner.request.post {
				uri: "project/new/upload",
				formData:
					qqfile: zip_file
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to upload project #{res.statusCode}")
				@uploaded_project_id = JSON.parse(body).project_id
				done()

		it "should not create the top-level folder", (done) ->
			ProjectGetter.getProject @uploaded_project_id, (error, project) ->
				expect(error).not.to.exist
				expect(project.rootFolder[0].folders.length).to.equal 0
				expect(project.rootFolder[0].docs.length).to.equal 2
				done()

	describe "uploading a project with backslashes in the path names", ->
		before (done) ->
			MockDocUpdaterApi.clearProjectStructureUpdates()

			zip_file = fs.createReadStream(Path.resolve(__dirname + '/../files/test_project_with_backslash_in_filename.zip'))

			@owner.request.post {
				uri: "project/new/upload",
				formData:
					qqfile: zip_file
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to upload project #{res.statusCode}")
				@uploaded_project_id = JSON.parse(body).project_id
				done()

		it "should treat the backslash as a directory separator", (done) ->
			ProjectGetter.getProject @uploaded_project_id, (error, project) ->
				expect(error).not.to.exist
				expect(project.rootFolder[0].folders[0].name).to.equal('styles')
				expect(project.rootFolder[0].folders[0].docs[0].name).to.equal('ao.sty')
				done()

	describe "uploading a project with files in different encodings", ->
		before (done) ->
			MockDocUpdaterApi.clearProjectStructureUpdates()

			zip_file = fs.createReadStream(Path.resolve(__dirname + '/../files/charsets/charsets.zip'))

			@owner.request.post {
				uri: "project/new/upload",
				formData:
					qqfile: zip_file
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to upload project #{res.statusCode}")
				@uploaded_project_id = JSON.parse(body).project_id
				done()

		it "should correctly parse windows-1252", ->
			{docUpdates: updates} = MockDocUpdaterApi.getProjectStructureUpdates(@uploaded_project_id)
			update = _.find updates, (update) ->
				update.pathname == '/test-german-windows-1252.tex'
			expect(update.docLines).to.contain("Der schnelle braune Fuchs sprang träge über den Hund.")

		it "should correctly parse German utf8", ->
			{docUpdates: updates} = MockDocUpdaterApi.getProjectStructureUpdates(@uploaded_project_id)
			update = _.find updates, (update) ->
				update.pathname == '/test-german-utf8x.tex'
			expect(update.docLines).to.contain("Der schnelle braune Fuchs sprang träge über den Hund.")

		it "should correctly parse little-endian utf16", ->
			{docUpdates: updates} = MockDocUpdaterApi.getProjectStructureUpdates(@uploaded_project_id)
			update = _.find updates, (update) ->
				update.pathname == '/test-greek-utf16-le-bom.tex'
			expect(update.docLines).to.contain("Η γρήγορη καστανή αλεπού πήδηξε χαλαρά πάνω από το σκυλί.")

		it "should correctly parse Greek utf8", ->
			{docUpdates: updates} = MockDocUpdaterApi.getProjectStructureUpdates(@uploaded_project_id)
			update = _.find updates, (update) ->
				update.pathname == '/test-greek-utf8x.tex'
			expect(update.docLines).to.contain("Η γρήγορη καστανή αλεπού πήδηξε χαλαρά πάνω από το σκυλί.")

	describe "uploading a file", ->
		beforeEach (done) ->
			MockDocUpdaterApi.clearProjectStructureUpdates()
			ProjectGetter.getProject example_project_id, (error, project) =>
				throw error if error?
				@root_folder_id = project.rootFolder[0]._id.toString()
				@project_0 = project
				done()

		it "should version a newly uploaded file", (done) ->
			image_file = fs.createReadStream(Path.resolve(__dirname + '/../files/1pixel.png'))

			req = @owner.request.post {
				uri: "project/#{example_project_id}/upload",
				qs:
					folder_id: @root_folder_id
				formData:
					qqfile:
						value: image_file
						options:
							filename: '1pixel.png',
							contentType: 'image/png'
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to upload file #{res.statusCode}")

				example_file_id = JSON.parse(body).entity_id

				{fileUpdates: updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
				expect(updates.length).to.equal(1)
				update = updates[0]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/1pixel.png")
				expect(update.url).to.be.a('string');
				@original_file_url = update.url
				expect(version).to.equal(@project_0.version + 1)

				ProjectGetter.getProject example_project_id, (error, newProject) =>
					throw error if error?
					@project_1 = newProject
					# uploading a new file does change the project structure
					expect(@project_1.version).to.equal(@project_0.version + 1)
					done()

		it "should version a replacement file", (done) ->
			image_file = fs.createReadStream(Path.resolve(__dirname + '/../files/2pixel.png'))

			req = @owner.request.post {
				uri: "project/#{example_project_id}/upload",
				qs:
					folder_id: @root_folder_id
				formData:
					qqfile:
						value: image_file
						options:
							filename: '1pixel.png',
							contentType: 'image/png'
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to upload file #{res.statusCode}")

				example_file_id = JSON.parse(body).entity_id

				{fileUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
				expect(updates.length).to.equal(2)
				update = updates[0]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/1pixel.png")
				#expect(update.url).to.be.a('string');
				update = updates[1]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/1pixel.png")
				expect(update.url).to.be.a('string');
				expect(version).to.equal(@project_0.version + 1)

				ProjectGetter.getProject example_project_id, (error, newProject) =>
					throw error if error?
					@project_1 = newProject
					# replacing a file should update the project structure
					expect(@project_1.version).to.equal(@project_0.version + 1)
					done()

	describe "moving entities", ->
		before (done) ->
			@owner.request.post {
				uri: "project/#{example_project_id}/folder",
				json:
					name: 'foo'
			}, (error, res, body) =>
				throw error if error?
				example_folder_id_1 = body._id
				done()

		beforeEach (done) ->
			MockDocUpdaterApi.clearProjectStructureUpdates()
			ProjectGetter.getProject example_project_id, (error, project) =>
				throw error if error?
				@root_folder_id = project.rootFolder[0]._id.toString()
				@project_0 = project
				done()

		it "should version moving a doc", (done) ->
			@owner.request.post {
				uri: "project/#{example_project_id}/Doc/#{example_doc_id}/move",
				json:
					folder_id: example_folder_id_1
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to move doc #{res.statusCode}")

				{docUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
				expect(updates.length).to.equal(1)
				update = updates[0]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/new.tex")
				expect(update.newPathname).to.equal("/foo/new.tex")
				expect(version).to.equal(@project_0.version + 2)

				ProjectGetter.getProject example_project_id, (error, newProject) =>
					throw error if error?
					@project_1 = newProject
					# replacing a file should update the project structure
					expect(@project_1.version).to.equal(@project_0.version + 2)  # 2 because it's a delete and then add
					done()

		it "should version moving a file", (done) ->
			@owner.request.post {
				uri: "project/#{example_project_id}/File/#{example_file_id}/move",
				json:
					folder_id: example_folder_id_1
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to move file #{res.statusCode}")

				{fileUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
				expect(updates.length).to.equal(1)
				update = updates[0]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/1pixel.png")
				expect(update.newPathname).to.equal("/foo/1pixel.png")
				expect(version).to.equal(@project_0.version + 2)

				ProjectGetter.getProject example_project_id, (error, newProject) =>
					throw error if error?
					@project_1 = newProject
					# replacing a file should update the project structure
					expect(@project_1.version).to.equal(@project_0.version + 2) # 2 because it's a delete and then add
					done()

		it "should version moving a folder", (done) ->
			@owner.request.post {
				uri: "project/#{example_project_id}/folder",
				json:
					name: 'bar'
			}, (error, res, body) =>
				throw error if error?
				example_folder_id_2 = body._id

				@owner.request.post {
					uri: "project/#{example_project_id}/Folder/#{example_folder_id_1}/move",
					json:
						folder_id: example_folder_id_2
				}, (error, res, body) =>
					throw error if error?
					if res.statusCode < 200 || res.statusCode >= 300
						throw new Error("failed to move folder #{res.statusCode}")

					{docUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
					expect(updates.length).to.equal(1)
					update = updates[0]
					expect(update.userId).to.equal(@owner._id)
					expect(update.pathname).to.equal("/foo/new.tex")
					expect(update.newPathname).to.equal("/bar/foo/new.tex")
					expect(version).to.equal(@project_0.version + 3)

					{fileUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
					expect(updates.length).to.equal(1)
					update = updates[0]
					expect(update.userId).to.equal(@owner._id)
					expect(update.pathname).to.equal("/foo/1pixel.png")
					expect(update.newPathname).to.equal("/bar/foo/1pixel.png")
					expect(version).to.equal(@project_0.version + 3)

					ProjectGetter.getProject example_project_id, (error, newProject) =>
						throw error if error?
						@project_1 = newProject
						# replacing a file should update the project structure
						expect(@project_1.version).to.equal(@project_0.version + 3) # because folder and 2 files move
						done()

	describe "renaming entities", ->
		beforeEach (done) ->
			MockDocUpdaterApi.clearProjectStructureUpdates()
			ProjectGetter.getProject example_project_id, (error, project) =>
				throw error if error?
				@root_folder_id = project.rootFolder[0]._id.toString()
				@project_0 = project
				done()

		it "should version renaming a doc", (done) ->
			@owner.request.post {
				uri: "project/#{example_project_id}/Doc/#{example_doc_id}/rename",
				json:
					name: 'new_renamed.tex'
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to move doc #{res.statusCode}")

				{docUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
				expect(updates.length).to.equal(1)
				update = updates[0]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/bar/foo/new.tex")
				expect(update.newPathname).to.equal("/bar/foo/new_renamed.tex")
				expect(version).to.equal(@project_0.version + 1)

				ProjectGetter.getProject example_project_id, (error, newProject) =>
					throw error if error?
					@project_1 = newProject
					# replacing a file should update the project structure
					expect(@project_1.version).to.equal(@project_0.version + 1)
					done()

		it "should version renaming a file", (done) ->
			@owner.request.post {
				uri: "project/#{example_project_id}/File/#{example_file_id}/rename",
				json:
					name: '1pixel_renamed.png'
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to move file #{res.statusCode}")

				{fileUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
				expect(updates.length).to.equal(1)
				update = updates[0]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/bar/foo/1pixel.png")
				expect(update.newPathname).to.equal("/bar/foo/1pixel_renamed.png")
				expect(version).to.equal(@project_0.version + 1)

				ProjectGetter.getProject example_project_id, (error, newProject) =>
					throw error if error?
					@project_1 = newProject
					# replacing a file should update the project structure
					expect(@project_1.version).to.equal(@project_0.version + 1)
					done()

		it "should version renaming a folder", (done) ->
			@owner.request.post {
				uri: "project/#{example_project_id}/Folder/#{example_folder_id_1}/rename",
				json:
					name: 'foo_renamed'
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to move folder #{res.statusCode}")

				{docUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
				expect(updates.length).to.equal(1)
				update = updates[0]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/bar/foo/new_renamed.tex")
				expect(update.newPathname).to.equal("/bar/foo_renamed/new_renamed.tex")
				expect(version).to.equal(@project_0.version + 1)

				{fileUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
				expect(updates.length).to.equal(1)
				update = updates[0]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/bar/foo/1pixel_renamed.png")
				expect(update.newPathname).to.equal("/bar/foo_renamed/1pixel_renamed.png")
				expect(version).to.equal(@project_0.version + 1)

				ProjectGetter.getProject example_project_id, (error, newProject) =>
					throw error if error?
					@project_1 = newProject
					# replacing a file should update the project structure
					expect(@project_1.version).to.equal(@project_0.version + 1)
					done()


	describe "deleting entities", ->
		beforeEach (done) ->
			MockDocUpdaterApi.clearProjectStructureUpdates()
			ProjectGetter.getProject example_project_id, (error, project) =>
				throw error if error?
				@root_folder_id = project.rootFolder[0]._id.toString()
				@project_0 = project
				done()

		it "should version deleting a folder", (done) ->
			@owner.request.delete {
				uri: "project/#{example_project_id}/Folder/#{example_folder_id_2}",
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to delete folder #{res.statusCode}")

				{docUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
				expect(updates.length).to.equal(1)
				update = updates[0]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/bar/foo_renamed/new_renamed.tex")
				expect(update.newPathname).to.equal("")
				expect(version).to.equal(@project_0.version + 1)

				{fileUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
				expect(updates.length).to.equal(1)
				update = updates[0]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/bar/foo_renamed/1pixel_renamed.png")
				expect(update.newPathname).to.equal("")
				expect(version).to.equal(@project_0.version + 1)

				ProjectGetter.getProject example_project_id, (error, newProject) =>
					throw error if error?
					@project_1 = newProject
					# replacing a file should update the project structure
					expect(@project_1.version).to.equal(@project_0.version + 1)
					done()

	describe "tpds", ->
		before (done) ->
			@tpds_project_name = "tpds-project-#{new ObjectId().toString()}"
			@owner.createProject @tpds_project_name, (error, project_id) =>
				throw error if error?
				@tpds_project_id = project_id
				mkdirp Settings.path.dumpFolder, done

		beforeEach (done) ->
			MockDocUpdaterApi.clearProjectStructureUpdates()
			ProjectGetter.getProject @tpds_project_id, (error, project) =>
				throw error if error?
				@root_folder_id = project.rootFolder[0]._id.toString()
				@project_0 = project
				done()

		it "should version adding a doc", (done) ->
			tex_file = fs.createReadStream(Path.resolve(__dirname + '/../files/test.tex'))

			req = @owner.request.post {
				uri: "/user/#{@owner._id}/update/#{@tpds_project_name}/test.tex",
				auth:
					user: _.keys(Settings.httpAuthUsers)[0]
					pass: _.values(Settings.httpAuthUsers)[0]
					sendImmediately: true
			}

			tex_file.on "error", (err) ->
				throw err

			req.on "error", (err) ->
				throw err

			req.on "response", (res) =>
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to upload file #{res.statusCode}")

				{docUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(@tpds_project_id)
				expect(updates.length).to.equal(1)
				update = updates[0]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/test.tex")
				expect(update.docLines).to.equal("Test")
				expect(version).to.equal(@project_0.version + 1)

				ProjectGetter.getProject @tpds_project_id, (error, newProject) =>
					throw error if error?
					@project_1 = newProject
					# replacing a file should update the project structure
					expect(@project_1.version).to.equal(@project_0.version + 1)
					done()

			tex_file.pipe(req)

		it "should version adding a new file", (done) ->
			image_file = fs.createReadStream(Path.resolve(__dirname + '/../files/1pixel.png'))

			req = @owner.request.post {
				uri: "/user/#{@owner._id}/update/#{@tpds_project_name}/1pixel.png",
				auth:
					user: _.keys(Settings.httpAuthUsers)[0]
					pass: _.values(Settings.httpAuthUsers)[0]
					sendImmediately: true
			}

			image_file.on "error", (err) ->
				throw err

			req.on "error", (err) ->
				throw err

			req.on "response", (res) =>
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to upload file #{res.statusCode}")

				{fileUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(@tpds_project_id)
				expect(updates.length).to.equal(1)
				update = updates[0]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/1pixel.png")
				expect(update.url).to.be.a('string');
				expect(version).to.equal(@project_0.version + 1)

				ProjectGetter.getProject @tpds_project_id, (error, newProject) =>
					throw error if error?
					@project_1 = newProject
					# replacing a file should update the project structure
					expect(@project_1.version).to.equal(@project_0.version + 1)
					done()

			image_file.pipe(req)

		it "should version replacing a file", (done) ->
			image_file = fs.createReadStream(Path.resolve(__dirname + '/../files/2pixel.png'))

			req = @owner.request.post {
				uri: "/user/#{@owner._id}/update/#{@tpds_project_name}/1pixel.png",
				auth:
					user: _.keys(Settings.httpAuthUsers)[0]
					pass: _.values(Settings.httpAuthUsers)[0]
					sendImmediately: true
			}

			image_file.on "error", (err) ->
				throw err

			req.on "error", (err) ->
				throw err

			req.on "response", (res) =>
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to upload file #{res.statusCode}")

				{fileUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(@tpds_project_id)
				expect(updates.length).to.equal(2)
				update = updates[0]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/1pixel.png")
				#expect(update.url).to.be.a('string');
				update = updates[1]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/1pixel.png")
				expect(update.url).to.be.a('string');
				expect(version).to.equal(@project_0.version + 1)

				ProjectGetter.getProject @tpds_project_id, (error, newProject) =>
					throw error if error?
					@project_1 = newProject
					# replacing a file should update the project structure
					expect(@project_1.version).to.equal(@project_0.version + 1)
					done()

			image_file.pipe(req)

		it "should version deleting a doc", (done) ->
			req = @owner.request.delete {
				uri: "/user/#{@owner._id}/update/#{@tpds_project_name}/test.tex",
				auth:
					user: _.keys(Settings.httpAuthUsers)[0]
					pass: _.values(Settings.httpAuthUsers)[0]
					sendImmediately: true
			}, (error, res, body) =>
				throw error if error?
				if res.statusCode < 200 || res.statusCode >= 300
					throw new Error("failed to delete doc #{res.statusCode}")

				{docUpdates:updates, version} = MockDocUpdaterApi.getProjectStructureUpdates(@tpds_project_id)
				expect(updates.length).to.equal(1)
				update = updates[0]
				expect(update.userId).to.equal(@owner._id)
				expect(update.pathname).to.equal("/test.tex")
				expect(update.newPathname).to.equal("")
				expect(version).to.equal(@project_0.version + 1)
				
				ProjectGetter.getProject @tpds_project_id, (error, newProject) =>
					throw error if error?
					@project_1 = newProject
					# replacing a file should update the project structure
					expect(@project_1.version).to.equal(@project_0.version + 1)
					done()


	describe "uploading a document", ->
		beforeEach (done) ->
			MockDocUpdaterApi.clearProjectStructureUpdates()
			ProjectGetter.getProject example_project_id, (error, project) =>
				throw error if error?
				@root_folder_id = project.rootFolder[0]._id.toString()
				@project_0 = project
				done()

		describe "with an unusual character set", ->
			it "should correctly handle utf16-le data", (done) ->
				document_file = fs.createReadStream(Path.resolve(__dirname + '/../files/charsets/test-greek-utf16-le-bom.tex'))

				req = @owner.request.post {
					uri: "project/#{example_project_id}/upload",
					qs:
						folder_id: @root_folder_id
					formData:
						qqfile:
							value: document_file
							options:
								filename: 'test-greek-utf16-le-bom.tex',
								contentType: 'text/x-tex'
				}, (error, res, body) =>
					throw error if error?
					if res.statusCode < 200 || res.statusCode >= 300
						throw new Error("failed to upload file #{res.statusCode}")

					example_file_id = JSON.parse(body).entity_id

					{docUpdates:updates} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
					update = updates[0]
					expect(update.pathname).to.equal('/test-greek-utf16-le-bom.tex')
					expect(update.docLines).to.contain("Η γρήγορη καστανή αλεπού πήδηξε χαλαρά πάνω από το σκυλί.")
					done()

			it "should correctly handle windows1252/iso-8859-1/latin1 data", (done) ->
				document_file = fs.createReadStream(Path.resolve(__dirname + '/../files/charsets/test-german-windows-1252.tex'))

				req = @owner.request.post {
					uri: "project/#{example_project_id}/upload",
					qs:
						folder_id: @root_folder_id
					formData:
						qqfile:
							value: document_file
							options:
								filename: 'test-german-windows-1252.tex',
								contentType: 'text/x-tex'
				}, (error, res, body) =>
					throw error if error?
					if res.statusCode < 200 || res.statusCode >= 300
						throw new Error("failed to upload file #{res.statusCode}")

					example_file_id = JSON.parse(body).entity_id

					{docUpdates:updates} = MockDocUpdaterApi.getProjectStructureUpdates(example_project_id)
					update = updates[0]
					expect(update.pathname).to.equal('/test-german-windows-1252.tex')
					expect(update.docLines).to.contain("Der schnelle braune Fuchs sprang träge über den Hund.")
					done()
