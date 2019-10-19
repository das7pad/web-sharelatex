/* eslint-disable
    camelcase,
    handle-callback-err,
    max-len,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let WikiController
const request = require('request')
const settings = require('settings-sharelatex')
const logger = require('logger-sharelatex')
const ErrorController = require('../../../../app/src/Features/Errors/ErrorController')
const _ = require('underscore')
const AuthenticationController = require('../../../../app/src/Features/Authentication/AuthenticationController')
const metrics = require('metrics-sharelatex')

const async = require('async')
const other_lngs = ['es']
const path = require('path')
const Url = require('url')

const baseWikiUrl =
  (settings.apis.wiki != null ? settings.apis.wiki.url : undefined) ||
  'https://learn.sharelatex.com'

module.exports = WikiController = {
  getPage(req, res, next) {
    let lngPage
    metrics.inc('wiki.getPage')
    let page = Url.parse(req.url).pathname
    page = page
      .replace(/^\/learn/, '')
      .replace(/^\//, '')
      .replace(/\/$/, '')
    const pageParts = page.split('/')
    const preview = req.query.preview != null

    // query for correct page
    // `/learn/kb` was changed to `/learn/how-to`
    // `/learn` was changed to `/learn/latex`
    if (page === '') {
      page = 'Main_Page'
    } else if (page === 'how-to') {
      page = 'Kb/Knowledge Base'
    } else if (pageParts[0].toLowerCase() === 'how-to') {
      pageParts.shift()
      page = `Kb/${pageParts.join('/')}`
    } else if (pageParts[0].toLowerCase() === 'latex') {
      pageParts.shift()
      page = pageParts.join('/')
    }

    const isFile = page.toLowerCase().indexOf('file:') !== -1

    const mediaWikiPages = ['help:', 'special:', 'template:']
    const isMediaWikiPage = _.some(
      mediaWikiPages,
      substring => page.toLowerCase().indexOf(substring) !== -1
    )

    if (isMediaWikiPage) {
      return ErrorController.notFound(null, res)
    }

    if (isFile) {
      return WikiController.proxy(req, res, next)
    }

    logger.log({ page }, 'getting page from wiki')

    if (_.include(other_lngs, req.lng)) {
      lngPage = `${page}_${req.lng}`
    } else {
      lngPage = page
    }

    const jobs = {
      contents(cb) {
        return WikiController._getPageContent('Contents', cb)
      },
      pageData(cb) {
        return WikiController._getPageContent(lngPage, cb)
      }
    }

    return async.parallel(jobs, function(error, results) {
      if (error != null) {
        return next(error)
      }
      const { pageData, contents } = results
      if (
        (pageData.content != null ? pageData.content.length : undefined) > 280
      ) {
        if (_.include(other_lngs, req.lng)) {
          pageData.title = pageData.title.slice(
            0,
            pageData.title.length - (req.lng.length + 1)
          )
        }

        pageData.title = (pageData.title || '').split('/').pop()

        // '.'s mess up translation keys
        // See https://github.com/i18next/i18next-node/issues/78
        pageData.title = pageData.title.replace(/\./g, '')

        return WikiController._renderPage(pageData, contents, preview, res)
      } else {
        return WikiController._getPageContent(page, function(error, pageData) {
          if (error != null) {
            return next(error)
          }
          return WikiController._renderPage(pageData, contents, preview, res)
        })
      }
    })
  },

  // only used for docker image
  proxy(req, res, next) {
    metrics.inc('wiki.proxy')
    const url = `${baseWikiUrl}${req.url}`
    logger.log({ url }, 'proxying page request to learn wiki')
    const oneMinute = 1000 * 60
    const urlStream = request.get({ url, timeout: oneMinute })

    urlStream.on('error', error => next(error))

    return urlStream.pipe(res)
  },

  _getPageContent(page, callback) {
    // the callback parameter `data` has a signature of `{content: "", title: ""}`
    // @param {string} page
    if (callback == null) {
      callback = function(error, data) {}
    }
    return request(
      {
        url: `${baseWikiUrl}/learn-scripts/api.php`,
        qs: {
          page: decodeURIComponent(page),
          action: 'parse',
          format: 'json',
          redirects: true
        }
      },
      function(err, response, data) {
        if (err != null) {
          return callback(err)
        }
        try {
          data = JSON.parse(data)
        } catch (error) {
          err = error
          logger.err({ err, data }, 'error parsing data from wiki')
        }

        const result = {
          categories: __guard__(data != null ? data.parse : undefined, x =>
            x.categories.map(category => category['*'])
          ),
          content: __guard__(
            __guard__(data != null ? data.parse : undefined, x2 => x2.text),
            x1 => x1['*']
          ),
          title: __guard__(
            data != null ? data.parse : undefined,
            x3 => x3.title
          ),
          revid: __guard__(
            data != null ? data.parse : undefined,
            x4 => x4.revid
          ),
          redirects: __guard__(
            data != null ? data.parse : undefined,
            x5 => x5.redirects
          )
        }
        return callback(null, result)
      }
    )
  },

  _renderPage(page, contents, preview, res) {
    let title
    if (
      !settings.overleaf &&
      (page.categories != null ? page.categories.length : undefined) > 0 &&
      Array.from(page.categories).includes('Draft') &&
      !preview
    ) {
      // pages with category draft were imported from v1 and should not be shown on sl
      // still allowing these pages to be previewed with ?preview in URL though
      return ErrorController.notFound(null, res)
    }
    if (
      (page.categories != null ? page.categories.length : undefined) > 0 &&
      Array.from(page.categories).includes('Hide') &&
      !preview
    ) {
      return ErrorController.notFound(null, res)
    }
    if (
      (page.redirects != null ? page.redirects.length : undefined) > 0 &&
      page.redirects[0].to !== 'Kb/Knowledge Base'
    ) {
      // Encoding ? below because some titles contain it, but it is not encoded in
      // the API, and is then handled as an empty query parameter and dropped,
      // resulting in a 404.
      const redirectTo = encodeURI(page.redirects[0].to).replace(/\?/g, '%3F')
      return res.redirect(`/learn/${redirectTo}`)
    }
    if (page.revid === 0) {
      return ErrorController.notFound(null, res)
    }

    if (page.title === 'Main Page') {
      title = 'Documentation'
    } else {
      ;({ title } = page)
    }
    const viewPath = path.join(__dirname, '../views/page')
    if (
      __guard__(
        settings.cdn != null ? settings.cdn.wiki : undefined,
        x => x.host
      ) != null
    ) {
      page.content = __guard__(page != null ? page.content : undefined, x1 =>
        x1.replace(
          /src="(\/[^"]+)"/g,
          `src='${__guard__(
            settings.cdn != null ? settings.cdn.web : undefined,
            x2 => x2.host
          )}$1'`
        )
      )
    }
    // width and alt below are Linked_images, but we are not using this and causes a JS error
    page.content = __guard__(page != null ? page.content : undefined, x3 =>
      x3.replace(/width='{{{width}}}'/g, '')
    )
    page.content = __guard__(page != null ? page.content : undefined, x4 =>
      x4.replace(/alt='{{{alt}}}'/g, '')
    )
    return res.render(viewPath, {
      page,
      contents,
      title,
      meta:
        'A comprehensive LaTeX guide with easy to understand examples and how-tos.'
    })
  }
}

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined
}
