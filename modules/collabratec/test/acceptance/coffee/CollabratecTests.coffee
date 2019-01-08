MockCollabratecApi = require "./helpers/MockCollabratecApi"
MockDocstoreApi = require "../../../../../test/acceptance/js/helpers/MockDocstoreApi"
MockDocUpdaterApi = require "../../../../../test/acceptance/js/helpers/MockDocUpdaterApi"
MockOverleafApi = require "./helpers/MockOverleafApi"
MockProjectHistoryApi = require "../../../../../test/acceptance/js/helpers/MockProjectHistoryApi"
Path = require "path"
ProjectModel = require("../../../../../app/js/models/Project").Project
URL = require "url"
User = require "../../../../../test/acceptance/js/helpers/User"
async = require "async"
chai = require "chai"
fs = require "fs"
mkdirp = require "mkdirp"
request = require "../../../../../test/acceptance/js/helpers/request"
settings = require "settings-sharelatex"

expect = chai.expect

_createUser = (overleafId, callback) ->
	user = new User()
	user.ensureUserExists (err) ->
		return callback err if err?
		user.deleteProjects (err) ->
			return callback err if err?
			user.setOverleafId overleafId, (err) ->
				return callback err if err?
				user.login (err) ->
					callback err, user

describe "Collabratec", ->
	before (done) ->
		mkdirp settings.path.dumpFolder, done

	before (done) ->
		_createUser 1, (err, user) =>
			return done err if err?
			@user = user
			@user.createProject "v2 project", {}, (err, project_id) =>
				return done err if err?
				@project_id = project_id
				@user.createProject "v1 import project", {}, (err, project_id) =>
					return done err if err?
					@v1_import_project_id = project_id
					@v1_import_project_token = '999token'
					set =
						"overleaf.id": "999"
						"tokens.readAndWrite": @v1_import_project_token
					ProjectModel.update {_id: project_id}, {$set: set}, done		
			@token1 =
				access_token:
					resource_owner_id: 1
				collabratec_customer_id: "collabratec-customer-id"
				user_profile:
					id: 1
					email: @user.email
			MockOverleafApi.addToken "good-token", @token1

	before (done) ->
		_createUser 2, (err, user) =>
			return done err if err?
			@user2 = user
			@token2 =
				access_token:
					resource_owner_id: 2
				user_profile:
					id: 2
					email: @user2.email
			MockOverleafApi.addToken "good-token2", @token2
			done()

	describe "getProjects", ->
		describe "without auth", ->
			it "should return 401", (done) ->
				options =
					url: "/api/v1/collabratec/users/current_user/projects"
				request options, (error, response, body) ->
					expect(response.statusCode).to.equal 401
					done()

		describe "without invalid bearer token", ->
			it "should return 401", (done) ->
				options =
					auth: bearer: "bad-token"
					url: "/api/v1/collabratec/users/current_user/projects"
				request options, (error, response, body) ->
					expect(response.statusCode).to.equal 401
					done()

		describe "with valid bearer token", ->
			before () ->
				@projects = [
					{ id: "proj-1", title: "v1 project a" },
					{ id: "proj-2", title: "v1 project b" },
					{ id: "proj-3", title: "v1 project c" },
					{ id: "proj-4", title: "v1 project d" },
					{ id: "proj-5", title: "v1 project e" },
					{ id: "proj-6", title: "v1 project f" },
					{ id: "proj-7", title: "v1 project g" },
					{ id: "proj-8", title: "v1 project h" },
					{ id: "proj-9", title: "v1 project i" },
					{ id: "proj-10", title: "v1 project j" },
					{ id: "proj-11", title: "v1 project k" },
					{ id: "proj-12", title: "v1 project l" },
					{ id: "proj-13", title: "v1 project m" },
					{ id: "proj-14", title: "v1 project n" },
					{ id: "proj-15", title: "v1 project o" },
					{ id: "proj-16", title: "v1 project p" },
				]
				MockOverleafApi.addProjects "good-token", @projects

			it "should return projects", (done) ->
				options =
					auth: bearer: "good-token"
					json: true
					url: "/api/v1/collabratec/users/current_user/projects"
				request options, (error, response, body) ->
					expect(response.statusCode).to.equal 200
					expect(body.projects.length).to.equal 18
					expect(body.paging).to.deep.equal {
						current_page: 1
						total_pages: 1
						total_items: 18
					}
					done()

			it "should sort results by title", (done) ->
				options =
					auth: bearer: "good-token"
					json: true
					url: "/api/v1/collabratec/users/current_user/projects"
					qs:
						page: 4
						page_size: 5
				request options, (error, response, body) ->
					expect(response.statusCode).to.equal 200
					expect(body.projects.length).to.equal 3
					expect(body.projects[0].title).to.equal "v1 project o"
					expect(body.projects[1].title).to.equal "v1 project p"
					expect(body.projects[2].title).to.equal "v2 project"
					done()

			it "should apply page_size", (done) ->
				options =
					auth: bearer: "good-token"
					json: true
					url: "/api/v1/collabratec/users/current_user/projects"
					qs:
						page_size: 5
				request options, (error, response, body) ->
					expect(response.statusCode).to.equal 200
					expect(body.projects.length).to.equal 5
					expect(body.paging).to.deep.equal {
						current_page: 1
						total_pages: 4
						total_items: 18
					}
					done()

			it "should apply page", (done) ->
				options =
					auth: bearer: "good-token"
					json: true
					url: "/api/v1/collabratec/users/current_user/projects"
					qs:
						page: 3
						page_size: 5
				request options, (error, response, body) ->
					expect(response.statusCode).to.equal 200
					expect(body.projects.length).to.equal 5
					expect(body.paging).to.deep.equal {
						current_page: 3
						total_pages: 4
						total_items: 18
					}
					done()

			it "should apply search", (done) ->
				options =
					auth: bearer: "good-token"
					json: true
					url: "/api/v1/collabratec/users/current_user/projects"
					qs:
						search: "v2"
				request options, (error, response, body) ->
					expect(response.statusCode).to.equal 200
					expect(body.projects.length).to.equal 1
					expect(body.projects[0].title).to.equal "v2 project"
					done()

			it "should return v1 id for imported project", (done) ->
				options =
					auth: bearer: "good-token"
					json: true
					url: "/api/v1/collabratec/users/current_user/projects"
					qs:
						search: "v1 import"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 200
					expect(body.projects.length).to.equal 1
					expect(body.projects[0].id).to.equal @v1_import_project_token
					done()

	describe "getProjectMetadata", ->
		describe "with v1 project id", ->
			before ->
				@project = { id: "proj-1", title: "v1 project a" }
				MockOverleafApi.addProjects "good-token", [ @project ]

			it "should fetch data from v1 api", (done) ->
				options =
					auth: bearer: "good-token"
					json: true
					url: "/api/v1/collabratec/users/current_user/projects/proj-1/metadata"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 200
					expect(body).to.deep.equal @project
					done()

		describe "with invalid v1 project id", ->
			it "should return 404", (done) ->
				options =
					auth: bearer: "good-token"
					url: "/api/v1/collabratec/users/current_user/projects/bad-project-id/metadata"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 404
					done()

		describe "with v2 project id", ->
			it "should return v2 project metadata", (done) ->
				options =
					auth: bearer: "good-token"
					json: true
					url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/metadata"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 200
					expect(body.title).to.equal "v2 project"
					done()

		describe "with v1 import project id", ->
			it "should return v2 project metadata", (done) ->
				options =
					auth: bearer: "good-token"
					json: true
					url: "/api/v1/collabratec/users/current_user/projects/#{@v1_import_project_token}/metadata"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 200
					expect(body.title).to.equal "v1 import project"
					done()

		describe "with invalid v2 project id", ->
			it "should return 404", (done) ->
				options =
					auth: bearer: "good-token"
					url: "/api/v1/collabratec/users/current_user/projects/5bd9b0232688a3011fd7cb4c/metadata"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 404
					done()

		describe "when user not allowed to access project", ->
			it "should return 403", (done) ->
				options =
					auth: bearer: "good-token2"
					headers:
						accept: "application/json"
					url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/metadata"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 403
					done()

	describe "createProject", ->
		describe "with missing template_id", ->
			it "should return 422", (done) ->
				options =
					auth: bearer: "good-token"
					json:
						collabratec_document_id: "collabratec-document-id"
						title: "title"
					method: "POST"
					url: "/api/v1/collabratec/users/current_user/projects"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 422
					done()

		describe "with missing title", ->
			it "should return 422", (done) ->
				options =
					auth: bearer: "good-token"
					json:
						collabratec_document_id: "collabratec-document-id"
						template_id: "template-id"
					method: "POST"
					url: "/api/v1/collabratec/users/current_user/projects"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 422
					done()

		describe "with missing collabratec_document_id", ->
			it "should return 422", (done) ->
				options =
					auth: bearer: "good-token"
					json:
						template_id: "template-id"
						title: "title"
					method: "POST"
					url: "/api/v1/collabratec/users/current_user/projects"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 422
					done()

		describe "with invalid template id", ->
			it "should return 404", (done) ->
				options =
					auth: bearer: "good-token"
					json:
						collabratec_document_id: "collabratec-document-id"
						template_id: "invalid-template-id"
						title: "title"
					method: "POST"
					url: "/api/v1/collabratec/users/current_user/projects"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 404
					done()

		describe "with valid template id", ->
			it "should create project", (done) ->
				options =
					auth: bearer: "good-token"
					json:
						collabratec_document_id: "collabratec-document-id"
						template_id: "valid-template-id"
						title: "title"
					method: "POST"
					url: "/api/v1/collabratec/users/current_user/projects"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 201
					expect(body.id).to.be.defined
					expect(body.url).to.be.defined
					done()

	describe "deleteProject", ->
		describe "with v1 project id", ->
			describe "when delete succeeds", ->
				it "should proxy to v1", (done) ->
					options =
						auth: bearer: "good-token"
						method: "DELETE"
						url: "/api/v1/collabratec/users/current_user/projects/good-project-id"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 204
						done()

			describe "when delete has error", ->
				it "should proxy to v1", (done) ->	
					options =
						auth: bearer: "good-token"
						method: "DELETE"
						url: "/api/v1/collabratec/users/current_user/projects/bad-project-id"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 422
						done()

		describe "with v2 project id", ->
			describe "when user owns project", ->
				describe "when project is linked to collabratec", ->
					before (done) ->
						update = $set: {
							collabratecUsers: [ {
								collabratec_document_id: "9999"
								user_id: @user.id
							} ]
						}
						ProjectModel.update {_id: @project_id}, update, done

					after (done) ->
						update = $unset: { collabratecUsers: 1 }
						ProjectModel.update {_id: @project_id}, update, done

					it "should archive project and return 204", (done) ->
						options =
							auth: bearer: "good-token"
							method: "DELETE"
							url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}"
						request options, (error, response, body) =>
							expect(response.statusCode).to.equal 204
							ProjectModel.find {_id: @project_id }, (err, project) ->
								return done err if err?
								done()

				describe "when project is not linked to collabratec", ->
					it "should return 422 error", (done) ->
						options =
							auth: bearer: "good-token"
							method: "DELETE"
							url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}"
						request options, (error, response, body) =>
							expect(response.statusCode).to.equal 422
							done()

			describe "when user does not own project", ->
				it "should return 422 error", (done) ->
					options =
						auth: bearer: "good-token2"
						method: "DELETE"
						url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 422
						done()

		describe "with v1 import project id", ->
			before (done) ->
				update = $set: {
					collabratecUsers: [ {
						collabratec_document_id: "9999"
						user_id: @user.id
					} ]
				}
				ProjectModel.update {_id: @v1_import_project_id}, update, done

			after (done) ->
				update = $unset: { collabratecUsers: 1 }
				ProjectModel.update {_id: @v1_import_project_id}, update, done

			it "should archive project and return 204", (done) ->
				options =
					auth: bearer: "good-token"
					method: "DELETE"
					url: "/api/v1/collabratec/users/current_user/projects/#{@v1_import_project_token}"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 204
					ProjectModel.find {_id: @v1_import_project_id }, (err, project) ->
						return done err if err?
						done()

	describe "linkProject", ->
		describe "with v1 project id", ->
			describe "when link succeeds", ->
				it "should proxy to v1", (done) ->
					options =
						auth: bearer: "good-token"
						json: true
						method: "POST"
						url: "/api/v1/collabratec/users/current_user/projects/good-project-id/collabratec"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 201
						expect(body).to.deep.equal project: "data"
						done()

			describe "when link has error", ->
				it "should proxy to v1", (done) ->	
					options =
						auth: bearer: "good-token"
						method: "POST"
						url: "/api/v1/collabratec/users/current_user/projects/bad-project-id/collabratec"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 422
						done()

		describe "with v2 project id", ->
			describe "when user owns project", ->
				describe "with collabratec_document_id", ->
					it "should link project and return 201", (done) ->
						options =
							auth: bearer: "good-token"
							json: collabratec_document_id: "collabratec-document-id"
							method: "POST"
							url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/collabratec"
						request options, (error, response, body) =>
							expect(response.statusCode).to.equal 201
							expect(body.title).to.equal "v2 project"
							ProjectModel.findOne {_id: @project_id }, (err, project) ->
								return done err if err?
								expect(project.collabratecUsers[0].collabratec_document_id).to.equal "collabratec-document-id"
								done()

				describe "without collabratec_document_id", ->
					it "should return 422", (done) ->
						options =
							auth: bearer: "good-token"
							json: true
							method: "POST"
							url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/collabratec"
						request options, (error, response, body) =>
							expect(response.statusCode).to.equal 422
							done()

			describe "when user does not own project", ->
				it "should return 403 error", (done) ->
					options =
						auth: bearer: "good-token2"
						json: collabratec_document_id: "collabratec-document-id"
						method: "POST"
						url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/collabratec"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 403
						done()

		describe "with v1 import project id", ->
			it "should link project and return 201", (done) ->
				options =
					auth: bearer: "good-token"
					json: collabratec_document_id: "collabratec-document-id"
					method: "POST"
					url: "/api/v1/collabratec/users/current_user/projects/#{@v1_import_project_token}/collabratec"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 201
					expect(body.title).to.equal "v1 import project"
					ProjectModel.findOne {_id: @v1_import_project_id }, (err, project) ->
						return done err if err?
						expect(project.collabratecUsers[0].collabratec_document_id).to.equal "collabratec-document-id"
						done()

	describe "unlinkProject", ->
		describe "with v1 project id", ->
			describe "when unlink succeeds", ->
				it "should proxy to v1", (done) ->
					options =
						auth: bearer: "good-token"
						json: true
						method: "DELETE"
						url: "/api/v1/collabratec/users/current_user/projects/good-project-id/collabratec"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 204
						done()

			describe "when unlink has error", ->
				it "should proxy to v1", (done) ->	
					options =
						auth: bearer: "good-token"
						method: "DELETE"
						url: "/api/v1/collabratec/users/current_user/projects/bad-project-id/collabratec"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 403
						done()

		describe "with v2 project id", ->
			describe "when user owns project", ->
				before (done) ->
					update = $set: {
						collabratecUsers: [ {
							collabratec_document_id: "9999"
							user_id: @user.id
						} ]
					}
					ProjectModel.update {_id: @project_id}, update, done

				it "should unlink project and return 201", (done) ->
					options =
						auth: bearer: "good-token"
						method: "DELETE"
						url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/collabratec"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 204
						ProjectModel.findOne {_id: @project_id }, (err, project) ->
							return done err if err?
							expect(project.collabratecUsers.length).to.equal 0
							done()

			describe "when user does not own project", ->
				it "should return 403 error", (done) ->
					options =
						auth: bearer: "good-token2"
						method: "DELETE"
						url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/collabratec"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 403
						done()

		describe "with v1 import project id", ->
			before (done) ->
				update = $set: {
					collabratecUsers: [ {
						collabratec_document_id: "9999"
						user_id: @user.id
					} ]
				}
				ProjectModel.update {_id: @v1_import_project_id}, update, done

			it "should unlink project and return 201", (done) ->
				options =
					auth: bearer: "good-token"
					method: "DELETE"
					url: "/api/v1/collabratec/users/current_user/projects/#{@v1_import_project_token}/collabratec"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 204
					ProjectModel.findOne {_id: @v1_import_project_id }, (err, project) ->
						return done err if err?
						expect(project.collabratecUsers.length).to.equal 0
						done()

	describe "cloneProject", ->
		describe "with v1 project id", ->
			describe "when clone succeeds", ->
				it "should proxy to v1", (done) ->
					options =
						auth: bearer: "good-token"
						json: true
						method: "POST"
						url: "/api/v1/collabratec/users/current_user/projects/good-project-id/clone"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 201
						expect(body).to.deep.equal project: "data"
						done()

			describe "when clone has error", ->
				it "should proxy to v1", (done) ->
					options =
						auth: bearer: "good-token"
						method: "POST"
						url: "/api/v1/collabratec/users/current_user/projects/bad-project-id/clone"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 422
						done()

		describe "with v2 project id", ->
			before ->
				MockOverleafApi.addCollabratecUser "collabratec-user-id-1", 1
				MockOverleafApi.addCollabratecUser "collabratec-user-id-2", 2

			describe "when user owns project", ->
				describe "with valid args", ->
					it "should clone project and return 201", (done) ->
						options =
							auth: bearer: "good-token"
							json:
								protect: "true"
								new_collabratec_document_id: "collabratec-document-id"
								new_owner_collabratec_customer_id: "collabratec-user-id-1"
							method: "POST"
							url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/clone"
						request options, (error, response, body) =>
							expect(response.statusCode).to.equal 201
							expect(body.id).to.be.defined
							expect(body.url).to.be.defined
							ProjectModel.findOne { _id: body.id }, (err, project) =>
								return done err if err?
								expect(project.name).to.equal "v2 project (1)"
								expect(project.collabratecUsers[0].user_id.toString()).to.equal @user.id
								done()

				describe "with different collabratec user id", ->
					it "should clone project for different user", (done) ->
						options =
							auth: bearer: "good-token"
							json:
								protect: "true"
								new_collabratec_document_id: "collabratec-document-id"
								new_owner_collabratec_customer_id: "collabratec-user-id-2"
							method: "POST"
							url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/clone"
						request options, (error, response, body) =>
							expect(response.statusCode).to.equal 201
							ProjectModel.findOne { _id: body.id }, (err, project) =>
								return done err if err?
								expect(project.collabratecUsers[0].user_id.toString()).to.equal @user2.id
								done()

				describe "without protect", ->
					it "should return 422", (done) ->
						options =
							auth: bearer: "good-token"
							json:
								new_collabratec_document_id: "collabratec-document-id"
								new_owner_collabratec_customer_id: "collabratec-user-id-1"
							method: "POST"
							url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/clone"
						request options, (error, response, body) =>
							expect(response.statusCode).to.equal 422
							done()

				describe "without new_collabratec_document_id", ->
					it "should return 422", (done) ->
						options =
							auth: bearer: "good-token"
							json:
								protect: "true"
								new_owner_collabratec_customer_id: "collabratec-user-id-1"
							method: "POST"
							url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/clone"
						request options, (error, response, body) =>
							expect(response.statusCode).to.equal 422
							done()

				describe "without new_owner_collabratec_customer_id", ->
					it "should return 422", (done) ->
						options =
							auth: bearer: "good-token"
							json:
								protect: "true"
								new_collabratec_document_id: "collabratec-document-id"
								new_owner_collabratec_customer_id: "invalid-collabratec-user-id"
							method: "POST"
							url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/clone"
						request options, (error, response, body) =>
							expect(response.statusCode).to.equal 422
							done()

				describe "without new_owner_collabratec_customer_id", ->
					it "should return 422", (done) ->
						options =
							auth: bearer: "good-token"
							json:
								protect: "true"
								new_collabratec_document_id: "collabratec-document-id"
							method: "POST"
							url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/clone"
						request options, (error, response, body) =>
							expect(response.statusCode).to.equal 422
							done()

			describe "when user does not own project", ->
				it "should return 403 error", (done) ->
					options =
						auth: bearer: "good-token2"
						json: collabratec_document_id: "collabratec-document-id"
						method: "POST"
						url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/clone"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 403
						done()

		describe "with v1 import project id", ->
			before ->
				MockOverleafApi.addCollabratecUser "collabratec-user-id-1", 1
				MockOverleafApi.addCollabratecUser "collabratec-user-id-2", 2

			it "should clone project and return 201", (done) ->
				options =
					auth: bearer: "good-token"
					json:
						protect: "true"
						new_collabratec_document_id: "collabratec-document-id"
						new_owner_collabratec_customer_id: "collabratec-user-id-1"
					method: "POST"
					url: "/api/v1/collabratec/users/current_user/projects/#{@v1_import_project_token}/clone"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 201
					ProjectModel.findOne { _id: body.id }, (err, project) =>
						return done err if err?
						expect(project.name).to.equal "v1 import project (1)"
						done()

	describe "uploadProject", ->
		beforeEach ->
			MockCollabratecApi.reset()

		describe "with collabratec v2 user", () ->
			describe "with valid args", ->
				it "should upload project", (done) ->
					options =
						auth: bearer: "good-token"
						formData:
							collabratec_document_id: "collabratec-document-id"
							collabratec_privategroup_id: "collabratec-privategroup-id"
							zipfile: fs.createReadStream(Path.resolve __dirname, "../files/test-template.zip")
						method: "POST"
						url: "/api/v1/collabratec/users/current_user/projects/upload"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 204
						# api calls back immediately so must wait for upload to complete
						# retry this 100 times waiting 100ms between tries (10s max)
						async.retry(
							100
							(callback) =>
								setTimeout(
									() =>
										return callback(new Error("project upload did not complete")) if MockCollabratecApi.requests.length == 0
										expect(MockCollabratecApi.requests.length).to.equal 1
										expect(MockCollabratecApi.requests[0].body.storageProviderId).to.be.defined
										expect(MockCollabratecApi.requests[0].body.uploadStatus).to.equal "success"
										expect(MockCollabratecApi.requests[0].headers["x-ppct-signature"]).to.be.defined
										expect(MockCollabratecApi.requests[0].headers["x-ppct-date"]).to.be.defined
										expect(MockCollabratecApi.requests[0].headers["x-extnet-access"]).to.equal "Y29sbGFicmF0ZWMtY3VzdG9tZXItaWQ="
										project_id = MockCollabratecApi.requests[0].body.storageProviderId
										ProjectModel.findOne {_id: project_id }, (err, project) =>
											return done err if err?
											expect(project.collabratecUsers[0].collabratec_document_id).to.equal "collabratec-document-id"
											expect(project.collabratecUsers[0].collabratec_privategroup_id).to.equal "collabratec-privategroup-id"
											expect(project.collabratecUsers[0].user_id.toString()).to.equal @user.id
										callback()
									100
								)
							(err) =>
								expect(err).to.be.undefined
								done()
						)

			describe "without collabratec_document_id", ->
				it "should return 422", (done) ->
					options =
						auth: bearer: "good-token"
						formData:
							collabratec_privategroup_id: "collabratec-privategroup-id"
							zipfile: fs.createReadStream(Path.resolve __dirname, "../files/test-template.zip")
						method: "POST"
						url: "/api/v1/collabratec/users/current_user/projects/upload"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 422
						done()

			describe "without zipfile", ->
				it "should return 422", (done) ->
					options =
						auth: bearer: "good-token"
						formData:
							collabratec_document_id: "collabratec-document-id"
							collabratec_privategroup_id: "collabratec-privategroup-id"
						method: "POST"
						url: "/api/v1/collabratec/users/current_user/projects/upload"
					request options, (error, response, body) =>
						expect(response.statusCode).to.equal 422
						done()
