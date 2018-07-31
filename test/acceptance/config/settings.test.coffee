module.exports =
	apis:
		v1:
			host: "http://localhost:5000"
	collabratec:
		oauth:
			client_id: "mock-collabratec-oauth-client-id"
		saml:
			callback_host: "http://mock-callback-host.com"
			callback_path: "/org/ieee/saml/consume"
			entry_point: "http://mock-entry-point.com"
			identifier_format: "urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified"
			init_path: "/org/ieee/saml/init"
			issuer: "mock-issuer"
	overleaf:
		host: "http://localhost:5000"
		s3:
			host: "http://localhost:5001" # MockS3Api
		oauth:
			clientID: "mock-oauth-client-id"
			clientSecret: "mock-oauth-client-secret"

	accountMerge:
		sharelatexHost: 'http://www.sharelatex.dev:3000'
		betaHost: "http://beta.overleaf.dev:4000"
		secret: "banana"

	siteUrl: 'http://beta.overleaf.dev:4000'

	allowPublicAccess: true
