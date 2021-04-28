const Settings = require('@overleaf/settings')
const { URL } = require('url')

function loadAll(availableLanguageCodes = []) {
  function getModule(lng) {
    if (Settings.i18n.loadLocalesFromDisk) {
      return require(`../../../generated/lng/${lng}`)
    } else {
      const Generator = require('../../../build/translations/generator')
      return Generator.generateModuleInMemory(lng)
    }
  }
  return new Map(availableLanguageCodes.map(lng => [lng, getModule(lng)]))
}

const fallbackLanguageCode = Settings.i18n.defaultLng || 'en'
const availableLanguageCodes = []
const availableHosts = new Map()
const subdomainConfigs = new Map()
Object.values(Settings.i18n.subdomainLang || {}).forEach(function (spec) {
  availableLanguageCodes.push(spec.lngCode)
  // prebuild a host->lngCode mapping for the usage at runtime in the
  //  middleware
  availableHosts.set(new URL(spec.url).host, spec.lngCode)

  // prebuild a lngCode -> language config mapping; some subdomains should
  //  not appear in the language picker
  if (!spec.hide) {
    subdomainConfigs.set(spec.lngCode, spec)
  }
})
if (!availableLanguageCodes.includes(fallbackLanguageCode)) {
  // always load the fallback locale
  availableLanguageCodes.push(fallbackLanguageCode)
}
const allLocales = loadAll(availableLanguageCodes)

function setLangBasedOnDomainMiddleware(req, res, next) {
  res.locals.getTranslationUrl = spec => {
    return spec.url + req.originalUrl
  }

  // prefer host and then fallback language over browser hint
  req.language = availableHosts.get(req.headers.host) || fallbackLanguageCode
  postprocess(req, res, next)
}
function setLangBasedOnSessionOrQueryParam(req, res, next) {
  res.locals.getTranslationUrl = spec => {
    const url = new URL(spec.url + req.originalUrl)
    // add the setGlobalLng query parameter while preserving other params
    url.searchParams.append('setGlobalLng', spec.lngCode)
    return url.href
  }

  if (req.query.setGlobalLng && subdomainConfigs.has(req.query.setGlobalLng)) {
    const { lngCode, url } = subdomainConfigs.get(req.query.setGlobalLng)
    req.session.lng = lngCode
    // cleanup the setGlobalLng query parameter and preserve other params
    const parsedURL = new URL(url + req.originalUrl)
    parsedURL.searchParams.delete('setGlobalLng')
    return res.redirect(parsedURL.href)
  }

  // prefer session and then fallback language over browser hint
  req.language = req.session.lng || fallbackLanguageCode
  postprocess(req, res, next)
}

const singleDomainMultipleLng =
  typeof Settings.i18n.singleDomainMultipleLng === 'boolean'
    ? Settings.i18n.singleDomainMultipleLng
    : availableHosts.size === 1 && availableLanguageCodes.length !== 1
const middleware = singleDomainMultipleLng
  ? setLangBasedOnSessionOrQueryParam
  : setLangBasedOnDomainMiddleware

function postprocess(req, res, next) {
  const browserLanguage = req.acceptsLanguages(availableLanguageCodes)
  if (browserLanguage && browserLanguage !== req.language) {
    // 'accept-language' header and fallbackLng mismatch
    // 'accept-language' header and host header mismatch
    // 'accept-language' header and ?setGlobalLng mismatch
    res.locals.suggestedLanguageSubdomainConfig = subdomainConfigs.get(
      browserLanguage
    )
  }

  req.lng = req.locale = res.locals.currentLngCode = req.language
  req.i18n = {}
  req.i18n.t = req.i18n.translate = allLocales.get(req.language)
  next()
}

module.exports = {
  middleware,
  i18n: { translate: allLocales.get('en') },
}
