MockDocstoreApi = require "../../../../../test/acceptance/js/helpers/MockDocstoreApi"
MockDocUpdaterApi = require "../../../../../test/acceptance/js/helpers/MockDocUpdaterApi"
MockOverleafApi = require "./helpers/MockOverleafApi"
MockProjectHistoryApi = require "../../../../../test/acceptance/js/helpers/MockProjectHistoryApi"
URL = require "url"
User = require "../../../../../test/acceptance/js/helpers/User"
chai = require "chai"
request = require "../../../../../test/acceptance/js/helpers/request"
settings = require "settings-sharelatex"

expect = chai.expect

describe "Collabratec", ->

	before (done) ->
		@user = new User()
		@user.ensureUserExists (error) =>
			return done error if error?
			@user.deleteProjects (error) =>
				return done error if error?
				@user.mongoUpdate { $set: { useCollabratecV2: true} }, (error) =>
					return done error if error?
					@user.setOverleafId 1, (error) =>
						return done error if error?
						@user.login (error) =>
							@user.createProject "v2 project", {}, (error, project_id) =>
								@project_id = project_id
								done(error)

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
					auth:
						bearer: "bad-token"
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
				@token =
					access_token:
						resource_owner_id: 1
					user_profile:
						id: 1
						email: @user.email
				MockOverleafApi.addToken "good-token", @token
				MockOverleafApi.addProjects "good-token", @projects

			it "should return projects", (done) ->
				options =
					auth:
						bearer: "good-token"
					url: "/api/v1/collabratec/users/current_user/projects"
				request options, (error, response, body) ->
					expect(response.statusCode).to.equal 200
					data = JSON.parse body
					expect(data.projects.length).to.equal 17
					expect(data.paging).to.deep.equal {
						current_page: 1
						total_pages: 1
						total_items: 17
					}
					done()

			it "should sort results by title", (done) ->
				options =
					auth:
						bearer: "good-token"
					url: "/api/v1/collabratec/users/current_user/projects"
					qs:
						page: 4
						page_size: 5
				request options, (error, response, body) ->
					expect(response.statusCode).to.equal 200
					data = JSON.parse body
					expect(data.projects.length).to.equal 2
					expect(data.projects[0].title).to.equal "v1 project p"
					expect(data.projects[1].title).to.equal "v2 project"
					done()

			it "should apply page_size", (done) ->
				options =
					auth:
						bearer: "good-token"
					url: "/api/v1/collabratec/users/current_user/projects"
					qs:
						page_size: 5
				request options, (error, response, body) ->
					expect(response.statusCode).to.equal 200
					data = JSON.parse body
					expect(data.projects.length).to.equal 5
					expect(data.paging).to.deep.equal {
						current_page: 1
						total_pages: 4
						total_items: 17
					}
					done()

			it "should apply page", (done) ->
				options =
					auth:
						bearer: "good-token"
					url: "/api/v1/collabratec/users/current_user/projects"
					qs:
						page: 3
						page_size: 5
				request options, (error, response, body) ->
					expect(response.statusCode).to.equal 200
					data = JSON.parse body
					expect(data.projects.length).to.equal 5
					expect(data.paging).to.deep.equal {
						current_page: 3
						total_pages: 4
						total_items: 17
					}
					done()

			it "should apply search", (done) ->
				options =
					auth:
						bearer: "good-token"
					url: "/api/v1/collabratec/users/current_user/projects"
					qs:
						search: "v2"
				request options, (error, response, body) ->
					expect(response.statusCode).to.equal 200
					data = JSON.parse body
					expect(data.projects.length).to.equal 1
					expect(data.projects[0].title).to.equal "v2 project"
					done()

	describe "getProjectMetadata", ->

		before ->
			@token =
				access_token:
					resource_owner_id: 1
				user_profile:
					id: 1
					email: "test@user.com"
			MockOverleafApi.addToken "good-token", @token

		describe "with v1 project id", ->

			before ->
				@project = { id: "proj-1", title: "v1 project a" }
				MockOverleafApi.addProjects "good-token", [ @project ]

			it "should fetch data from v1 api", (done) ->
				options =
					auth:
						bearer: "good-token"
					url: "/api/v1/collabratec/users/current_user/projects/proj-1/metadata"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 200
					data = JSON.parse body
					expect(data).to.deep.equal @project
					done()

		describe "with invalid v1 project id", ->

			it "should return 404", (done) ->
				options =
					auth:
						bearer: "good-token"
					url: "/api/v1/collabratec/users/current_user/projects/bad-project-id/metadata"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 404
					done()

		describe "with v2 project id", ->

			it "should return v2 project metadata", (done) ->
				options =
					auth:
						bearer: "good-token"
					url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/metadata"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 200
					data = JSON.parse body
					expect(data.title).to.equal "v2 project"
					done()

		describe "with invalid v2 project id", ->

			it "should return 404", (done) ->
				options =
					auth:
						bearer: "good-token"
					url: "/api/v1/collabratec/users/current_user/projects/5bd9b0232688a3011fd7cb4c/metadata"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 404
					done()

		describe "when user not allowed to access project", ->

			before (done) ->
				@user2 = new User()
				@user2.ensureUserExists (error) =>
					return done error if error?
					@user2.deleteProjects (error) =>
						return done error if error?
						@user2.mongoUpdate { $set: { useCollabratecV2: true} }, (error) =>
							return done error if error?
							@user2.setOverleafId 2, (error) =>
								return done error if error?
								@user2.login done
				@token2 =
					access_token:
						resource_owner_id: 2
					user_profile:
						id: 2
						email: @user2.email
				MockOverleafApi.addToken "good-token2", @token2

			it "should return 403", (done) ->
				options =
					auth:
						bearer: "good-token2"
					headers:
						accept: "application/json"
					url: "/api/v1/collabratec/users/current_user/projects/#{@project_id}/metadata"
				request options, (error, response, body) =>
					expect(response.statusCode).to.equal 403
					done()
