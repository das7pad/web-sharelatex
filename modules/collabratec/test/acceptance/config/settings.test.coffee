module.exports =
	collabratec:
		api:
			base_url: "http://localhost:7000"
			hmac_key: "collabratec-hmac-key"
			secret: "collabratec-hmac-secret"
		oauth:
			client_id: ""
		saml:
			callback_host: ""
			callback_path: ""
			cert: ""
			entry_point: ""
			identifier_format: ""
			init_path: ""
			issuer: ""
	apis:
		v1:
			host: "http://localhost:5000"
	overleaf:
		host: "http://localhost:5000"
		s3:
			host: "http://localhost:5001" # MockS3Api
		oauth:
			clientID: "mock-oauth-client-id"
			clientSecret: "mock-oauth-client-secret"
	siteUrl: "http://beta.overleaf.dev:4000"
