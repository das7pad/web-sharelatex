path = require 'path'
url = require 'url'
sanitizeHtml = require 'sanitize-html'
logger = require 'logger-sharelatex'
PortalsManager = require './PortalsManager'
ErrorController = require '../../../../app/js/Features/Errors/ErrorController'
AuthenticationController = require '../../../../app/js/Features/Authentication/AuthenticationController'
UserGetter = require '../../../../app/js/Features/User/UserGetter'
SubscriptionGroupHandler = require '../../../../app/js/Features/Subscription/SubscriptionGroupHandler'
V1Api = require '../../../../app/js/Features/V1/V1Api'
TemplatesUtilities = require '../../../v2-templates/app/js/TemplatesUtilities'
Settings = require 'settings-sharelatex'

sanitizeOptions = if Settings?.modules?.sanitize?.options? then Settings.modules.sanitize.options else sanitizeHtml.defaults

_portalRedirect = (req, res, data, portalType) ->
	# for when portal loaded via wrong type (/edu or /org),
	# or if the portal contains a redirect URL

	requestedUrl = "#{req.protocol}://#{req.hostname}#{req.path}"
	if data.portal.redirect_url && data.portal.redirect_url != requestedUrl
		# when slug was incorrect when portal created
		res.redirect 301, data.portal.redirect_url
		return true

	# redirect to correct portal type, if needed
	if data.university?.id && !data.university.institution
		correctPortalType = 'edu'
	else
		correctPortalType = 'org'

	if portalType != correctPortalType
		res.redirect 301, "/#{correctPortalType}/#{req.params.slug}"
		return true

	return false


_portalLayoutData = (req, data) ->
	# sanitize html and replace v1 classes with v2
	for key of data.portal
		if key.indexOf('html') != -1 && data.portal[key]
			data.portal[key] = sanitizeHtml(data.portal[key].replace(/link-as-button/g, 'btn btn-success'), sanitizeOptions)

	# for print view
	if req.query.media && req.query.media == 'print'
		data.print = true

	# metadata
	data.metadata = {}
	if data.portal?.title
		data.metadata.title = data.portal.title
	data.metadata.viewport = true

  data

_getPortal = (req, res, next, portalType) ->
	if req.query.prtl || Settings.showContentPages
		if req.params.slug && req.params.slug != 'undefined'
			v1PortalPath = "/#{portalType}/#{req.params.slug}"

			PortalsManager.get v1PortalPath, (err, data) ->
				return next(err) if err
				if data.portal?
					redirected = _portalRedirect req, res, data, portalType
					if !redirected
						# check if user is affiliated with portal
						_getUser req, next, (err, userId, userEmails) ->
							if userEmails
								_isAffiliated data, userId, userEmails, (err, affiliation) ->
									if err then data.affiliation_error = true
									data.affiliation = affiliation
									_formatAndRender(req, res, data)
							else
								_formatAndRender(req, res, data)
				else
					ErrorController.notFound req, res
		else
			ErrorController.notFound req, res
	else
		ErrorController.notFound req, res

_getUser = (req, next, callback = (err, userId, userEmails)->) ->
	user_id = AuthenticationController.getLoggedInUserId(req)
	if user_id
		UserGetter.getUserFullEmails user_id, (error, userEmails) ->
			return next(error) if error?
			callback(null, user_id, userEmails)
	else
		callback(null, null, null)

_isAffiliated = (portal, userId, userEmails, callback = (err, affiliation)->) ->
	promises = []

	_affiationCheck = (email) ->
		affiliation = null
		return new Promise (resolve, reject) ->
			if portal.university?.id && email.affiliation?.institution?.id && email.affiliation.institution.id == portal.university.id
				# univeristy portals
				affiliation = if email.confirmedAt then 'confirmed' else 'pending'
				resolve affiliation
			else if portal.team?.v2_id
				# non univeristy paid portals
				SubscriptionGroupHandler.isUserPartOfGroup userId, portal.team.v2_id, (err, partOfGroup)->
					return reject(err) if err?
					affiliation = if partOfGroup then 'confirmed' else null
					resolve affiliation
			else
				resolve affiliation

	for email in userEmails
		promises.push(_affiationCheck(email))

	Promise.all(promises).then (affiliations) ->
		if 'confirmed' in affiliations
			callback(null, 'confirmed')
		else if 'pending' in affiliations
			callback(null, 'pending')
		else
			callback(null, null)
	.catch (error) ->
		callback(error, null)

_formatAndRender = (req, res, data) ->
	portalLayout = path.resolve(__dirname, '../views/portal')
	data = _portalLayoutData(req, data)
	if data.portal_templates
		data.portal_templates = _formatTemplatesData(data.portal_templates)
	res.render(portalLayout, data)

_formatTemplatesData = (allTemplates) ->
	# allTemplates is an array of objects
	# each object is a different template list
	# which contains the list plus UI data: header_class, header
	for templatesObj in allTemplates
		if templatesObj.list
			for template in templatesObj.list
				TemplatesUtilities.format_template(template)
	allTemplates

module.exports = PortalsController =
	# to do: decide if using v1 content
	# getIndexEdu: (req, res, next) ->
	# 	res.render(Path.resolve(__dirname, '../views/index'))

	# to do: decide to add
	# /org not on v1
	# getIndexOrg: (req, res, next) ->
	# 	res.render(Path.resolve(__dirname, '../views/index'))

	getPortalEdu: (req, res, next) ->
		_getPortal(req, res, next, 'edu')

	getPortalOrg: (req, res, next) ->
		_getPortal(req, res, next, 'org')

	friendlyTemplateLink: (req, res, next) ->
		V1Api.request {
			method: 'GET'
			url: req.path
			expectedStatusCodes: [200]
		}, (err, response, body) ->
			return next(err) if err
			if response.statusCode in [200] and response.body.kind and response.body.read_token and response.body.slug
				res.redirect 301, "/latex/#{response.body.kind}s/#{response.body.slug}/#{response.body.read_token}"
			else
				logger.err {path: req.path, err}, "v1 publisher friendly template link not found"
				ErrorController.notFound req, res
