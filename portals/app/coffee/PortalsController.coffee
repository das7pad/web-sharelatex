path = require 'path'
url = require 'url'
sanitizeHtml = require 'sanitize-html'
logger = require 'logger-sharelatex'
PortalsManager = require './PortalsManager'
ErrorController = require '../../../../app/js/Features/Errors/ErrorController'

sanitizeOpts = 
	allowedAttributes:
		'a': [ 'href', 'name', 'target', 'class' ]
		'div': [ 'class', 'id' ]
		'iframe': [ 'allowfullscreen', 'frameborder', 'height', 'src', 'width' ]

_portalRedirect = (req, res, data, portalType) ->
	# for when portal loaded via wrong type (/edu or /org),
	# or if the portal contains a redirect URL

	requestedUrl = "#{req.protocol}://#{req.hostname}#{req.path}"

	if data.portal.redirect_url && data.portal.redirect_url != requestedUrl
		# when slug was incorrect when portal created
		res.redirect 301, data.portal.redirect_url
		return true

	# redirect to correct portal type, if needed
	if data.university && !data.university.institution
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
			data.portal[key] = sanitizeHtml(data.portal[key].replace(/link-as-button/g, 'btn btn-success'), sanitizeOpts)

	# for print view
	if req.query.media && req.query.media == 'print'
		data.print = true

	# metadata
	if data.portal?.title
		data.metadata = {
			title: data.portal.title
		}

	data

_getPortal = (req, res, next, portalType) ->
	if !req.query.prtl
		ErrorController.notFound req, res
	else if req.params.slug && req.params.slug != 'undefined'
		v1PortalPath = "/#{portalType}/#{req.params.slug}"
		portalLayout = path.resolve(__dirname, '../views/portal')
			
		PortalsManager.get v1PortalPath, (err, data) ->
			return next(err) if err
			if data.portal?
				redirected = _portalRedirect req, res, data, portalType
				if !redirected
					data = _portalLayoutData(req, data)
					res.render(portalLayout, data) 
			else
				ErrorController.notFound req, res
	else
		ErrorController.notFound req, res

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