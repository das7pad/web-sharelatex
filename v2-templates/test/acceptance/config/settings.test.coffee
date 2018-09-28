module.exports =
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
