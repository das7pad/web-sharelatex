SandboxedModule = require "sandboxed-module"
assert = require "assert"
Path = require "path"
modulePath = Path.join __dirname, "../../../app/js/GitBridgeHandler"
sinon = require "sinon"
sinonChai = require "sinon-chai"
chai = require "chai"
chai.use sinonChai
expect = chai.expect


describe "GitBridgeHandler", ->
	beforeEach ->
		@projectId = "abcd"
		@userId = "bcde"
		@GitBridgeHandler = SandboxedModule.require modulePath, requires:
			'settings-sharelatex': @Settings = {}
			'logger-sharelatex': { log: sinon.stub(), err: sinon.stub() }
			'../../../../app/js/Features/Project/ProjectGetter': @ProjectGetter = {}
			'../../../../app/js/Features/User/UserGetter': @UserGetter = {}
			'../../../../app/js/Features/Project/ProjectEntityHandler': @ProjectEntityHandler = {}
			'../../../../app/js/Features/Project/ProjectHistoryHandler': @ProjectHistoryHandler = {}
			'../../../../app/js/Features/Editor/EditorHttpController': @EditorHttpController = {}
			'../../../../app/js/infrastructure/FileWriter': @FileWriter = {}
			'../../../../app/js/Features/ThirdPartyDataStore/UpdateMerger': @UpdateMerger = {}
			'request': @Request = {}
		@ProjectHistoryHandler.ensureHistoryExistsForProject = sinon.stub().yields(null)

	describe "_formatGitBridgeSnapshot", ->
		beforeEach ->
			@Settings.apis = {v1_history: {url: 'http://example.com'}}
			@rawData = {
				projectId: @projectId,
				files: {
					'main.tex': {
						data: {
							content: "some content or whatever"
						},
						metadata: {}
					},
					'things/other.png': {
						data: {
							hash: "b2c3cc5be"
						},
						metadata: {}
					}
				}
			}

		it "should convert the data to the snapshot format", (done) ->
			@GitBridgeHandler._formatGitBridgeSnapshot @rawData, (err, snapshot) =>
				expect(err).to.not.exist
				expect(snapshot).to.deep.equal {
					srcs: [
						["some content or whatever", "main.tex"]
					],
					atts: [
						["http://example.com/blobs/b2c3cc5be/content", "things/other.png"]
					]
				}
				done()

		it "should produce an error for an unknown kind of file", (done) ->
			@rawData.files['bad.mp3.exe'] = {
				data: {something: 'lol'}
			}
			@GitBridgeHandler._formatGitBridgeSnapshot @rawData, (err, snapshot) =>
				expect(err).to.exist
				expect(err).to.be.instanceof Error
				expect(snapshot).to.not.exist
				done()

	describe "_prepareSnapshotFiles", ->
		beforeEach ->
			@EditorHttpController._nameIsAcceptableLength = sinon.stub().returns(true)
			@project = {_id: @projectId}
			@snapshot = {
				files: [
					{
						name: 'one.tex', # spaces are deliberate
						url: 'http://example.com/one'
					},
					{
						name: 'stuff/two.tex',
						url: 'http://example.com/two'
					}
				]
			}

		it "should validate and prepare the list of files", (done) ->
			@GitBridgeHandler._prepareSnapshotFiles @project, @snapshot, (err, files) =>
				expect(err).to.not.exist
				expect(files).to.deep.equal [
					{
						name: 'one.tex', # spaces are deliberate
						url: 'http://example.com/one'
					},
					{
						name: 'stuff/two.tex',
						url: 'http://example.com/two'
					}
				]
				done()

		describe "when a file name is invalid", ->
			beforeEach ->
				@EditorHttpController._nameIsAcceptableLength = sinon.stub().returns(false)

			it "should produce an error", (done) ->
				@GitBridgeHandler._prepareSnapshotFiles @project, @snapshot, (err, files) =>
					expect(err).to.exist
					expect(err).to.be.instanceof Error
					expect(files).to.not.exist
					done()

	describe "_prepareEntityOperations", ->
		beforeEach ->
			@project = {_id: @projectId}
			@docs = [
				{path: '/one.tex'},
				{path: '/two.tex'}
			]
			@files = [
				{path: '/three.png'}
				{path: '/four.jpg'}
			]
			@ProjectEntityHandler.getAllEntitiesFromProject = sinon.stub().yields(null, @docs, @files)
			@snapshotFiles = [
				{name: 'one.tex'},
				{name: 'two.tex', url: 'http://example.com/two'}
				{name: 'four.jpg'}
			]

		it "should prepare a set of operations to perform", (done) ->
			@GitBridgeHandler._prepareEntityOperations @project, @snapshotFiles, (err, operations) =>
				expect(err).to.not.exist
				expect(operations).to.deep.equal {
					deleteEntities: [
						{path: '/three.png'}  # Not present in snapshotFiles, and so deleted
					]
					changeEntities: [
						{path: '/two.tex', url: 'http://example.com/two'}
					]
				}
				done()

	describe "_fetchContentToDisk", ->
		beforeEach ->
			@project = {_id: @projectId}
			@operations = {
				deleteEntities: [],
				changeEntities: [
					{path: '1.tex', url: 'http://example.com/one'},
					{path: '2.tex'},
					{path: '3.tex', url: 'http://example.com/three'},
					{path: '4.tex'},
				]
			}
			@stream = {one: 1}
			@Request.get = sinon.stub().returns(@stream)
			@FileWriter.writeStreamToDisk = sinon.stub().yields(null, '/tmp/some/path')

		it "should fetch content for operations with urls", (done) ->
			@GitBridgeHandler._fetchContentToDisk @project, @operations, (err, operations) =>
				expect(err).to.not.exist
				expect(operations).to.deep.equal {
					deleteEntities: [],
					changeEntities: [
						{path: '1.tex', url: 'http://example.com/one', contentFsPath: '/tmp/some/path'},
						{path: '2.tex'},
						{path: '3.tex', url: 'http://example.com/three', contentFsPath: '/tmp/some/path'},
						{path: '4.tex'},
					]
				}
				expect(@Request.get.callCount).to.equal 2
				expect(@FileWriter.writeStreamToDisk.callCount).to.equal 2
				expect(@FileWriter.writeStreamToDisk.calledWith(
					sinon.match.string,
					@stream
				)).to.equal true
				done()

	describe "_getMigratedFromId", ->
		beforeEach ->

		describe "with a project not imported from v1", ->
			beforeEach ->
				@project = {}

			it "should produce a null id", (done) ->
				@GitBridgeHandler._getMigratedFromId @project, (err, migratedFromId) =>
					expect(err).to.not.exist
					expect(migratedFromId).to.not.exist
					done()

		describe "with a imported from v1, but with a non-matching token", ->
			beforeEach ->
				@project = {
					overleaf: {id: 1234},
					tokens: {readAndWrite: "5678abcd"}
				}

			it "should produce a null id", (done) ->
				@GitBridgeHandler._getMigratedFromId @project, (err, migratedFromId) =>
					expect(err).to.not.exist
					expect(migratedFromId).to.not.exist
					done()

		describe "with a imported from v1", ->
			beforeEach ->
				@project = {
					overleaf: {id: 1234},
					tokens: {readAndWrite: "1234aaaabbbbccccdddd"}
				}

			it "should produce the read-write token as the id", (done) ->
				@GitBridgeHandler._getMigratedFromId @project, (err, migratedFromId) =>
					expect(err).to.not.exist
					expect(migratedFromId).to.exist
					expect(migratedFromId).to.equal @project.tokens.readAndWrite
					done()
