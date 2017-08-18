refresh = require('passport-oauth2-refresh')
request = require 'request'
logger = require "logger-sharelatex"

OAuthRequest =
	_doRequest: (user, opts, callback = (error, body) ->) ->
		if !user?.overleaf?.accessToken?
			return callback(new Error("user does not have access token for overleaf"))
		opts.headers ?= {}
		opts.headers.Authorization = "Bearer #{user.overleaf.accessToken}"
		logger.log {opts}, "making overleaf request"
		request opts, (error, response, body) ->
			return callback(error) if error?
			if 200 <= response.statusCode < 300
				return callback null, body
			else
				error = new Error("overleaf returned non-success code: #{response.statusCode}")
				error.statusCode = response.statusCode
				return callback error
	
	_refreshAccessToken: (user, callback = (error) ->) ->
		logger.log {user_id: user._id, overleaf: user.overleaf}, "refreshing user token"
		refresh.requestNewAccessToken 'overleaf', user.overleaf.refreshToken, (error, accessToken, refreshToken) ->
			return callback(error) if error?
			user.overleaf.accessToken = accessToken
			user.overleaf.refreshToken = refreshToken
			user.save callback
	
	request: (user, opts, callback = (error, body) ->) ->
		OAuthRequest._doRequest user, opts, (error, body) ->
			if error?
				if error.statusCode == 401
					OAuthRequest._refreshAccessToken user, (error) ->
						return callback(error) if error?
						return OAuthRequest._doRequest user, opts, callback
				else
					return callback(error)
			else
				return callback null, body

module.exports = OAuthRequest.request