crypto = require "crypto"
request = require "request"
settings = require "settings-sharelatex"

DEFAULT_PARAMS = {
	baseUrl: settings?.collabratec?.api?.base_url
	json: true,
	timeout: 30 * 1000
}

collabratecRequest = request.defaults(DEFAULT_PARAMS)

module.exports = CollabratecApi =
	request: (collabratec_customer_id, options, callback) ->
		return callback(new Error "collabratec api not configured") unless DEFAULT_PARAMS.baseUrl?
		return callback(new Error "method required") unless options.method?
		return callback(new Error "uri required") unless options.uri?
		# get RFC-1123 time which is included in in headers and signed
		current_time = new Date().toUTCString()
		# get uppercase method for signature
		method = options.method.toUpperCase()
		# get full url for signature
		uri = "#{DEFAULT_PARAMS.baseUrl}#{options.uri}"
		# build token text to sign
		token_text = [ method, collabratec_customer_id, current_time, uri ].join("\n")
		# generate hmac signature
		hmac = crypto.createHmac("sha256", settings.collabratec.api.hmac_key)
		hmac.update(token_text)
		signature = hmac.digest("base64")
		# set auth headers
		options.headers =
			"X-ppct-signature": "#{settings.collabratec.api.secret}:#{signature}"
			"X-ppct-date": current_time
			"X-extnet-access": Buffer.from(collabratec_customer_id).toString("base64")
		# make request
		collabratecRequest options, (error, response, body) ->
			return callback(error, response, body) if error?
			if 200 <= response.statusCode < 300 or response.statusCode in (options.expectedStatusCodes or [])
				callback null, response, body
			else
				error = new Error("collabratec returned non-success code: #{response.statusCode} #{options.method} #{options.uri}")
				error.statusCode = response.statusCode
				callback error
