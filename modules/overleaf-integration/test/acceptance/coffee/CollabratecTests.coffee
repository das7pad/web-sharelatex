MockDocstoreApi = require "../../../../../test/acceptance/js/helpers/MockDocstoreApi"
MockDocUpdaterApi = require "../../../../../test/acceptance/js/helpers/MockDocUpdaterApi"
MockOverleafApi = require "./helpers/MockOverleafApi"
ProjectModel = require("../../../../../app/js/models/Project").Project
Request = require "request"
URL = require "url"
User = require "../../../../../test/acceptance/js/helpers/User"
chai = require "chai"
createMockSamlResponse = require "./helpers/createMockSamlResponse"
request = require "../../../../../test/acceptance/js/helpers/request"
oauthLink = require "./helpers/oauthLink"

expect = chai.expect

login_collabratec_id_exists_saml = createMockSamlResponse('User', 'Exists', 'mock-user@exists.com', '1111')
login_collabratec_id_does_not_exist_saml = createMockSamlResponse('User', 'DoesNotExist', 'mock-user@does-not-exist.com', '2222')
login_collabratec_email_exists = createMockSamlResponse('User', 'EmailExist', 'mock-user@email-exists.com', '3333')
login_collabratec_already_connected = createMockSamlResponse('User', 'AlreadyConnected', 'mock-user@already-connected.com', '4444')

describe "Collabratec", ->

	beforeEach (done) ->
		@user = new User()
		@user.getCsrfToken done

	describe "oauthLink", ->

		describe "when params valid", ->
			it "should redirect to saml init", (done) ->
				options =
					qs:
						client_id: "mock-collabratec-oauth-client-id"
					url: "/collabratec/auth/link"
				request options, (error, response, body) ->
					expect(response.statusCode).to.equal 302
					expect(response.headers.location).to.equal "/org/ieee/saml/init"
					done()

		describe "when params invalid", ->
			it "should show error page", (done) ->
				request.get "/collabratec/auth/link", (error, response, body) ->
					expect(response.statusCode).to.equal 200
					done()

	describe "init", ->
		it "should redirect to Collabratec SAML init endpoint", (done) ->
			request.get "/org/ieee/saml/init", (error, response, body) ->
				expect(response.statusCode).to.equal 302
				url = URL.parse(response.headers.location)
				expect(url.host).to.equal "mock-entry-point.com"
				done()

	describe "consume", ->

		describe "when doing oauth link", ->
			it "should redirect to oauth link flow", (done) ->
				options =
					qs:
						client_id: "mock-collabratec-oauth-client-id"
					url: "/collabratec/auth/link"
				@user.request options, (error, response, body) =>
					options =
						form:
							SAMLResponse: login_collabratec_id_exists_saml
						method: 'post'
						url: '/org/ieee/saml/consume'
					@user.request options, (error, response, body) ->
						expect(response.statusCode).to.equal 302
						url = URL.parse(response.headers.location)
						expect(url.path).to.equal '/org/ieee/collabratec/auth/link_after_saml_response'
						done()

		describe "when doing sign-in", ->

			describe "when collabratec id exists", ->
				it "should redirect to logged in page", (done) ->
					options =
						form:
							SAMLResponse: login_collabratec_id_exists_saml
						method: 'post'
						url: '/org/ieee/saml/consume'
					@user.request options, (error, response, body) ->
						expect(response.statusCode).to.equal 302
						url = URL.parse(response.headers.location)
						expect(url.path).to.equal '/project'
						done()

			describe "when collabratec id does not exist", ->
				it "should redirect to log in page", (done) ->
					options =
						form:
							SAMLResponse: login_collabratec_id_does_not_exist_saml
						method: 'post'
						url: '/org/ieee/saml/consume'
					@user.request options, (error, response, body) ->
						expect(response.statusCode).to.equal 302
						url = URL.parse(response.headers.location)
						expect(url.path).to.equal '/login?sso_error=collabratec_account_not_registered'
						done()

	describe "oauthLinkAfterSaml", ->

		describe "when logged out", ->

			describe "when collabratec id exists", ->
				it "should show link page with existing account messaging", (done) ->
					oauthLink login_collabratec_id_exists_saml, @user, (err) =>
						return done(err) if err?
						options =
							url: '/org/ieee/collabratec/auth/link_after_saml_response'
						@user.request options, (error, response, body) ->
							expect(response.statusCode).to.equal 200
							expect(body).to.match /Link Overleaf to IEEE Collabratec/
							expect(body).to.match /It looks like you've already signed up to Overleaf/
							done()

			describe "when collabratec id does not exist", ->
				it "should show link page with create/log in messaging", (done) ->
					oauthLink login_collabratec_id_does_not_exist_saml, @user, (err) =>
						return done(err) if err?
						options =
							url: '/org/ieee/collabratec/auth/link_after_saml_response'
						@user.request options, (error, response, body) ->
							expect(response.statusCode).to.equal 200
							expect(body).to.match /Link Overleaf to IEEE Collabratec/
							expect(body).not.to.match /It looks like you've already signed up to Overleaf/
							done()

		describe "when logged in", ->
			beforeEach (done) ->
				@user.login done

			it "should show link logged in account page", (done) ->
				oauthLink login_collabratec_id_does_not_exist_saml, @user, (err) =>
					return done(err) if err?
					options =
						url: '/org/ieee/collabratec/auth/link_after_saml_response'
					@user.request options, (error, response, body) ->
						expect(response.statusCode).to.equal 200
						expect(body).to.match /Link Overleaf to IEEE Collabratec/
						expect(body).to.match /Please confirm that you would like to link your Overleaf account/
						done()

	describe "oauthConfirmLink", ->

		describe "when logged out", ->
			it "should register new account", (done) ->
				oauthLink login_collabratec_id_does_not_exist_saml, @user, (err) =>
					return done(err) if err?
					options =
						method: 'post'
						url: '/org/ieee/collabratec/auth/confirm_link'
					@user.request options, (error, response, body) ->
						expect(response.statusCode).to.equal 302
						url = URL.parse(response.headers.location)
						expect(url.path).to.equal '/oauth/authorize?client_id=mock-collabratec-oauth-client-id'
						done()

		describe "when logged in", ->
			beforeEach (done) ->
				@user.login done

			describe "when collabratec id does not exist", ->
				beforeEach (done) ->
					@user.setOverleafId "88883333", done

				it "should link account", (done) ->
					oauthLink login_collabratec_email_exists, @user, (err) =>
						return done(err) if err?
						options =
							method: 'post'
							url: '/org/ieee/collabratec/auth/confirm_link'
						@user.request options, (error, response, body) ->
							expect(response.statusCode).to.equal 302
							url = URL.parse(response.headers.location)
							expect(url.path).to.equal '/oauth/authorize?client_id=mock-collabratec-oauth-client-id'
							done()

				it "should set pro features", (done) ->
					oauthLink login_collabratec_email_exists, @user, (err) =>
						return done(err) if err?
						options =
							method: 'post'
							url: '/org/ieee/collabratec/auth/confirm_link'
						@user.request options, (error, response, body) =>
							expect(response.statusCode).to.equal 302
							@user.get (err, user) ->
								return done(err) if err?
								expect(user.features.collaborators).to.equal -1
								expect(user.features.dropbox).to.equal true
								done()

	describe "showProject", ->

		it "should redirect to saml sign in flow from /org/ieee/collabratec/projects/:project_id", (done) ->
			options =
				method: 'get'
				url: '/org/ieee/collabratec/projects/mock-project-id'
			@user.request options, (error, response, body) ->
				expect(response.statusCode).to.equal 302
				url = URL.parse(response.headers.location)
				expect(url.path).to.equal '/org/ieee/saml/init'
				done()

		describe "with v1 project id", ->
			it "should redirect to v1 project after sign-in", (done) ->
				options =
					method: 'get'
					url: '/org/ieee/collabratec/projects/mock-project-id'
				@user.request options, (error, response, body) =>
					expect(response.statusCode).to.equal 302
					url = URL.parse(response.headers.location)
					expect(url.path).to.equal '/org/ieee/saml/init'

					options =
						form:
							SAMLResponse: login_collabratec_id_exists_saml
						method: 'post'
						url: '/org/ieee/saml/consume'
					@user.request options, (error, response, body) =>
						expect(response.statusCode).to.equal 302
						url = URL.parse(response.headers.location)
						expect(url.path).to.equal '/sign_in_to_v1?return_to=%2Fmock-project-id'
						done()

		describe "with v1 project id imported to v2", ->
			before (done) ->
				@user.createProject "v1 import project", {}, (err, project_id) =>
					return done err if err?
					@v1_import_project_id = project_id
					@v1_import_project_token = '999token'
					set =
						"overleaf.id": "999"
						"tokens.readAndWrite": @v1_import_project_token
					ProjectModel.update {_id: project_id}, {$set: set}, done

			it "should redirect to v2 project after sign-in", (done) ->
				options =
					method: 'get'
					url: "/org/ieee/collabratec/projects/#{@v1_import_project_token}"
				@user.request options, (error, response, body) =>
					expect(response.statusCode).to.equal 302
					url = URL.parse(response.headers.location)
					expect(url.path).to.equal '/org/ieee/saml/init'

					options =
						form:
							SAMLResponse: login_collabratec_id_exists_saml
						method: 'post'
						url: '/org/ieee/saml/consume'
					@user.request options, (error, response, body) =>
						expect(response.statusCode).to.equal 302
						url = URL.parse(response.headers.location)
						expect(url.path).to.equal "/project/#{@v1_import_project_id}"
						done()

		describe "with v2 project id", ->
			it "should redirect to v2 project after sign-in", (done) ->
				options =
					method: 'get'
					url: '/org/ieee/collabratec/projects/5c07e81e63573801493d93c3'
				@user.request options, (error, response, body) =>
					expect(response.statusCode).to.equal 302
					url = URL.parse(response.headers.location)
					expect(url.path).to.equal '/org/ieee/saml/init'

					options =
						form:
							SAMLResponse: login_collabratec_id_exists_saml
						method: 'post'
						url: '/org/ieee/saml/consume'
					@user.request options, (error, response, body) =>
						expect(response.statusCode).to.equal 302
						url = URL.parse(response.headers.location)
						expect(url.path).to.equal '/project/5c07e81e63573801493d93c3'
						done()

	describe "showDash", ->

		it "should redirect to saml sign in flow from /org/ieee/collabratec/dash", (done) ->
			options =
				method: 'get'
				url: '/org/ieee/collabratec/dash'
			@user.request options, (error, response, body) ->
				expect(response.statusCode).to.equal 302
				url = URL.parse(response.headers.location)
				expect(url.path).to.equal '/org/ieee/saml/init'
				done()

		it "should redirect to /project after sign-in", (done) ->
			options =
				method: 'get'
				url: '/org/ieee/collabratec/dash'
			@user.request options, (error, response, body) =>
				expect(response.statusCode).to.equal 302
				url = URL.parse(response.headers.location)
				expect(url.path).to.equal '/org/ieee/saml/init'

				options =
					form:
						SAMLResponse: login_collabratec_id_exists_saml
					method: 'post'
					url: '/org/ieee/saml/consume'
				@user.request options, (error, response, body) =>
					expect(response.statusCode).to.equal 302
					url = URL.parse(response.headers.location)
					expect(url.path).to.equal '/project'
					done()
