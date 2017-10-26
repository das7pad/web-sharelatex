# overleaf-account-merge

Service to provide a token that represents a ShareLaTeX user's consent to merge their account to the beta.

## Installation

This is intended for the "legacy" instance of SL, *not* the beta instance. It won't cause a problem if installed there, but won't be used.

To install, clone into the `modules` directory in the `web` service.

## Configuration

It requires these settings:

```coffee
accountMerge:
	sharelatexHost: "URL_TO_LEGACY_INSTANCE"
	betaHost: "URL_TO_BETA_INSTANCE"
	secret: "GENERATED_SECRET" # Not the same as the OL OAuth client secret
```
