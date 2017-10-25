# overleaf-integration-web-module

Service to request tokens from Overleaf and "legacy" ShareLaTeX and verifies them, allowing merging of accounts. Once verified projects can be imported from Overleaf.

## Installation

This is intended for the beta instance of SL, *not* the "legacy" instance. To do this it overwrites the `/login` route, meaning that you cannot be logged into "legacy" SL and the beta in the same instance (without causing a redirect loop).

To install, clone into the `modules` directory in the `web` service.

## Configuration

The Overleaf instance must have a SL OAuth App. The easiest way to create this is in the rails console:

```
Doorkeeper::Application.create!(
	name: 'ShareLaTeX',
	redirect_uri: 'URL_TO_LEGACY_SL_INSTANCE/overleaf/callback',
	scopes: 'sharelatex'
)
```

You'll then need to add the client id & client secret that Doorkeeper creates to the beta instance settings. You can view these in the admin console (assuming you're a super admin).

It requires the following settings:

```coffee
overleaf:
	oauth:
		clientID: "CLIENT_ID_FROM_OVERLEAF_OAUTH_APP"
		clientSecret: "CLIENT_SECRET_FROM_OVERLEAF_OAUTH_APP"
	host: "URL_TO_OVERLEAF_INSTANCE"
```