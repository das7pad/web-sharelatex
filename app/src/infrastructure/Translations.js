const Settings = require('settings-sharelatex')
const { URL } = require('url')

function loadAll(availableLngCodes = []) {
  function getModule(lng) {
    if (Settings.i18n.loadLocalesFromDisk) {
      return require(`../../../generated/lng/${lng}`)
    } else {
      const Generator = require('../../../build/translations/generator')
      return Generator.generateModuleInMemory(lng)
    }
  }
  return new Map(availableLngCodes.map(lng => [lng, getModule(lng)]))
}

const options = Settings.i18n || {}

const subdomainLang = new Map(Object.entries(options.subdomainLang || {}))
const availableLngCodes = []
const availableHosts = new Map()
subdomainLang.forEach(function(spec) {
  availableLngCodes.push(spec.lngCode)
  availableHosts.set(new URL(spec.url).host, spec.lngCode)
})

const fallbackLng = options.defaultLng || 'en'
if (!availableLngCodes.includes(fallbackLng)) {
  availableLngCodes.push(fallbackLng)
}
const allLocales = loadAll(availableLngCodes)

function setLangBasedOnDomainMiddleware(req, res, next) {
  res.locals.getTranslationUrl = spec => {
    return spec.url + req.originalUrl
  }

  // prefer host and then fallback language over browser hint
  req.language = availableHosts.get(req.headers.host) || fallbackLng
  postprocess(req, res, next)
}
function setLangBasedOnSessionOrQueryParam(req, res, next) {
  res.locals.getTranslationUrl = spec => {
    const url = new URL(spec.url + req.originalUrl)
    // add the setGlobalLng query parameter while preserving other params
    url.searchParams.append('setGlobalLng', spec.lngCode)
    return url.href
  }

  if (req.query.setGlobalLng && subdomainLang.has(req.query.setGlobalLng)) {
    const { lngCode, url } = subdomainLang.get(req.query.setGlobalLng)
    req.session.lng = lngCode
    // cleanup the setGlobalLng query parameter and preserve other params
    const parsedURL = new URL(url + req.originalUrl)
    parsedURL.searchParams.delete('setGlobalLng')
    return res.redirect(parsedURL.href)
  }

  // prefer session and then fallback language over browser hint
  req.language = req.session.lng || fallbackLng
  postprocess(req, res, next)
}

const singleDomainMultipleLng =
  typeof options.singleDomainMultipleLng === 'boolean'
    ? options.singleDomainMultipleLng
    : availableHosts.size === 1 && availableLngCodes.length !== 1
const middleware = singleDomainMultipleLng
  ? setLangBasedOnSessionOrQueryParam
  : setLangBasedOnDomainMiddleware

function postprocess(req, res, next) {
  if (req.query.setLng) {
    // Developers/Users can override the language per request
    if (!availableLngCodes.includes(req.query.setLng)) {
      return res.status(400).json({ message: 'invalid lngCode' })
    }
    req.language = req.query.setLng
  }

  const browserLanguage = req.acceptsLanguages(availableLngCodes)
  if (browserLanguage && browserLanguage !== req.language) {
    // 'accept-language' header and fallbackLng mismatch
    // 'accept-language' header and host header mismatch
    // 'accept-language' header and ?setGlobalLng mismatch
    // 'accept-language' header and ?setLng mismatch
    req.showUserOtherLng = browserLanguage
  }

  req.lng = req.locale = req.language
  req.i18n = {}
  req.i18n.t = req.i18n.translate = allLocales.get(req.language)
  next()
}

// backwards compatibility
middleware.expressMiddleware = middleware.expressMiddlewear = middleware
middleware.setLangBasedOnDomainMiddlewear = (req, res, next) => next()
middleware.setLangBasedOnDomainMiddleware = (req, res, next) => next()
middleware.i18n = { translate: allLocales.get('en') }

module.exports = middleware
