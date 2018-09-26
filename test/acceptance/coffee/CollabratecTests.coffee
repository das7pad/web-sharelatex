MockOverleafApi = require "./helpers/MockOverleafApi"
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
