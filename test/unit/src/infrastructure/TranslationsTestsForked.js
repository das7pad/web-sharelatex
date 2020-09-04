const accepts = require('accepts')
const SandboxedModule = require('sandboxed-module')
const { expect } = require('chai')
const sinon = require('sinon')
require('chai').use(require('sinon-chai'))
const assert = require('assert').strict

const MODULE_PATH = '../../../../app/src/infrastructure/Translations.js'

describe('TranslationsForked', function() {
  const subdomainLang = Object.fromEntries(
    ['cn', 'da', 'de', 'es', 'fr', 'pt', 'ru']
      .map(lang => {
        return [
          lang,
          {
            lngCode: lang,
            url: `https://${lang}.sharelatex.com`
          }
        ]
      })
      .concat([['www', { lngCode: 'en', url: 'https://www.sharelatex.com' }]])
  )
  const allLocaleKeys = Object.keys(
    require('../../../../locales/en.json')
  ).sort()

  beforeEach(function() {
    const options = {
      subdomainLang
    }
    this.translations = SandboxedModule.require(MODULE_PATH, {
      requires: { 'settings-sharelatex': { i18n: options } },
      globals: { process }
    })

    this.req = {
      acceptsLanguages: function() {
        const accept = accepts(this)
        return accept.languages.apply(accept, arguments)
      },
      headers: {
        'accept-language': ''
      },
      originalUrl: '/login',
      query: {},
      session: {},
      url: '/login'
    }
    this.res = {
      setHeader() {},
      locals: {},
      redirect: sinon.stub()
    }
    this.appName = `Overleaf Dev (${Math.random()})`

    // taken from web/app/src/infrastructure/ExpressLocals.js
    this.res.locals.translate = (key, vars) => {
      vars = vars || {}
      vars.appName = this.appName
      return this.req.i18n.t(key, vars)
    }
  })

  describe('without any provided options', function() {
    beforeEach(function() {
      this.translationsModule = SandboxedModule.require(MODULE_PATH, {
        requires: { 'settings-sharelatex': { i18n: {} } },
        globals: { process }
      })
      this.translations = this.translationsModule
    })

    it('should be able to translate', function() {
      expect(
        this.translations.i18n.translate(
          'not_found_error_from_the_supplied_url'
        )
      ).to.exist.and.to.not.equal('not_found_error_from_the_supplied_url')
    })
  })

  describe('i18n.translate', function() {
    function cloneVars(vars) {
      // i18n adds the used language as `.lng` into the vars when there is no
      //  exact locale for a given language available. this in turn corrupts
      //  following translations with the same context -- they are using the
      //  `.lng` as language:
      // vars={}; translate('ENOENT', vars); vars.lng === 'someLang'
      if (typeof vars !== 'object') return vars
      return Object.assign({}, vars)
    }
    const LOCALE_MAPS = new Map(
      Object.values(subdomainLang)
        .map(spec => spec.lngCode)
        .map(lang => [
          lang,
          new Map(Object.entries(require(`../../../../locales/${lang}.json`)))
        ])
    )
    function getLocale(lang, key) {
      return LOCALE_MAPS.get(lang).get(key)
    }
    function getLocaleWithFallback(lang, key) {
      return getLocale(lang, key) || getLocale('en', key) || key
    }
    const KEYS = new RegExp('__(.+?)__', 'g')

    beforeEach(function() {
      this.mockedTranslate = (lang, key, vars) => {
        vars = vars || {}
        vars.appName = this.appName
        return getLocaleWithFallback(lang, key).replace(
          KEYS,
          (field, label) => vars[label] || field
        )
      }
    })
    ;[
      {
        desc: 'when the locale is plain text',
        key: 'email'
      },
      {
        desc: 'when there is html in the locale',
        key: 'track_changes_is_on'
      },
      {
        desc: 'when there are additional variables',
        key: 'register_to_edit_template',
        vars: { templateName: `[${Math.random()}]` }
      },
      {
        desc: 'when there is html in the vars',
        key: 'click_here_to_view_sl_in_lng',
        vars: { lngName: `<strong>${Math.random()}</strong>` }
      }
    ].forEach(testSpec => {
      describe(testSpec.desc, function() {
        Object.values(subdomainLang).forEach(langSpec => {
          it(`should translate for lang=${langSpec.lngCode}`, function(done) {
            this.req.headers.host = new URL(langSpec.url).host
            this.translations(this.req, this.res, () => {
              const actual = this.res.locals.translate(
                testSpec.key,
                cloneVars(testSpec.vars)
              )
              const expected = this.mockedTranslate(
                langSpec.lngCode,
                testSpec.key,
                cloneVars(testSpec.vars)
              )
              expect(actual).to.equal(expected)
              done()
            })
          })
        })
      })
    })

    describe('when setLng is set and the host header is www', function() {
      Object.values(subdomainLang).forEach(langSpec => {
        it(`should translate for lang=${langSpec.lngCode}`, function(done) {
          this.req.headers.host = new URL(subdomainLang.www.url).host
          this.req.query.setLng = langSpec.lngCode
          this.translations(this.req, this.res, () => {
            const actual = this.res.locals.translate(
              'beta_program_badge_description'
            )
            const expected = this.mockedTranslate(
              langSpec.lngCode,
              'beta_program_badge_description'
            )
            expect(actual).to.equal(expected)
            done()
          })
        })
      })
    })
    describe('perf', function() {
      function bench(numOfMiddlewareInvocations, keys) {
        Object.values(subdomainLang).forEach(langSpec => {
          it(`should translate for lang=${langSpec.lngCode}`, function(done) {
            this.timeout(60 * 1000)
            let doneCounter = numOfMiddlewareInvocations
            function eventuallyCallDone() {
              if (!--doneCounter) done()
            }
            this.req.headers.host = new URL(subdomainLang.www.url).host
            this.req.query.setLng = langSpec.lngCode
            let i = doneCounter
            if (i === 1) {
              while (i--) {
                this.translations(this.req, this.res, () => {
                  for (const key of keys) {
                    const actual = this.res.locals.translate(key)
                    const expected = this.mockedTranslate(langSpec.lngCode, key)
                    assert.equal(actual, expected, key)
                  }
                  eventuallyCallDone()
                })
              }
            } else {
              // validate once
              this.translations(this.req, this.res, () => {
                for (const key of keys) {
                  const actual = this.res.locals.translate(key)
                  const expected = this.mockedTranslate(langSpec.lngCode, key)
                  assert.equal(actual, expected, key)
                }
              })
              while (i--) {
                this.translations(this.req, this.res, () => {
                  for (const key of keys) {
                    this.res.locals.translate(key)
                  }
                  eventuallyCallDone()
                })
              }
            }
          })
        })
      }

      describe('translate all keys (~40k items)', function() {
        let allKeys = allLocaleKeys.slice()
        Array.from({ length: 5 }).forEach(() => {
          allKeys = allKeys.concat(allKeys)
        })
        bench(1, allKeys)
      })
      describe('invoke middleware (100k times and translate no keys)', function() {
        bench(100 * 1000, [])
      })
      describe('invoke middleware (2k times and translate 10 keys)', function() {
        const keys = allLocaleKeys.slice(490, 500)
        bench(2 * 1000, keys)
      })
      describe('invoke middleware (2k times and translate 20 keys)', function() {
        const keys = allLocaleKeys.slice(500, 520)
        bench(2 * 1000, keys)
      })
      describe('invoke middleware (2k times and translate 30 keys)', function() {
        const keys = allLocaleKeys.slice(520, 550)
        bench(2 * 1000, keys)
      })
      describe('invoke middleware (2k times and translate 40 keys)', function() {
        const keys = allLocaleKeys.slice(600, 640)
        bench(2 * 1000, keys)
      })
      describe('invoke middleware (2k times and translate 50 keys)', function() {
        const keys = allLocaleKeys.slice(640, 700)
        bench(2 * 1000, keys)
      })
      describe('invoke middleware (2k times and translate 100 keys)', function() {
        const keys = allLocaleKeys.slice(700, 800)
        bench(2 * 1000, keys)
      })
      describe('invoke middleware (10k times and translate 20 keys)', function() {
        const keys = allLocaleKeys.slice(800, 820)
        bench(10 * 1000, keys)
      })
      describe('invoke middleware (10k times and translate 40 keys)', function() {
        const keys = allLocaleKeys.slice(820, 860)
        bench(10 * 1000, keys)
      })
    })
  })

  describe('setLangBasedOnDomainMiddleware', function() {
    it('should set the lang to french if the domain is fr', function(done) {
      this.req.headers.host = 'fr.sharelatex.com'
      this.translations(this.req, this.res, () => {
        expect(this.req.lng).to.equal('fr')
        done()
      })
    })

    describe('showUserOtherLng', function() {
      it('should set it to true if the languge based on headers is different to lng', function(done) {
        this.req.headers['accept-language'] = 'da, en-gb;q=0.8, en;q=0.7'
        this.req.headers.host = 'fr.sharelatex.com'
        this.translations(this.req, this.res, () => {
          expect(this.req.showUserOtherLng).to.equal('da')
          done()
        })
      })

      it('should not set prop', function(done) {
        this.req.headers['accept-language'] = 'da, en-gb;q=0.8, en;q=0.7'
        this.req.headers.host = 'da.sharelatex.com'
        this.translations(this.req, this.res, () => {
          expect(this.req.showUserOtherLng).to.not.exist
          done()
        })
      })
    })

    describe('getTranslationUrl', function() {
      describe('with not query params', function() {
        beforeEach(function(done) {
          this.req.originalUrl = '/login'
          this.translations(this.req, this.res, done)
        })
        it('should set the setGlobalLng query param', function() {
          expect(
            this.res.locals.getTranslationUrl({
              lngCode: 'da',
              url: 'https://da.sharelatex.com'
            })
          ).to.equal('https://da.sharelatex.com/login')
        })
      })
      describe('with additional query params', function() {
        beforeEach(function(done) {
          this.req.originalUrl = '/login?someKey=someValue'
          this.translations(this.req, this.res, done)
        })
        it('should preserve the query param', function() {
          expect(
            this.res.locals.getTranslationUrl({
              lngCode: 'da',
              url: 'https://da.sharelatex.com'
            })
          ).to.equal('https://da.sharelatex.com/login?someKey=someValue')
        })
      })
    })

    describe('singleDomainMultipleLng', function() {
      beforeEach(function() {
        const options = {
          subdomainLang: {
            www: { lngCode: 'en', url: 'https://www.sharelatex.com' },
            fr: { lngCode: 'fr', url: 'https://www.sharelatex.com' },
            da: { lngCode: 'da', url: 'https://www.sharelatex.com' }
          }
        }
        this.translations = SandboxedModule.require(MODULE_PATH, {
          requires: { 'settings-sharelatex': { i18n: options } },
          globals: { process }
        })
      })

      describe('when nothing is set', function() {
        beforeEach(function(done) {
          this.translations(this.req, this.res, done)
        })
        it('should not set a lng in the session', function() {
          expect(this.req.session.lng).to.not.exist
        })
        it('should default to english', function() {
          expect(this.req.lng).to.equal('en')
        })
        it('should not suggest anything', function() {
          expect(this.req.showUserOtherLng).to.not.exist
        })
      })

      describe('when the browser sends hints', function() {
        beforeEach(function(done) {
          this.req.headers['accept-language'] = 'da, en-gb;q=0.8, en;q=0.7'
          this.translations(this.req, this.res, done)
        })
        it('should not set a lng in the session', function() {
          expect(this.req.session.lng).to.not.exist
        })
        it('should default to english', function() {
          expect(this.req.lng).to.equal('en')
        })
        it('should suggest the language from the browser hint', function() {
          expect(this.req.showUserOtherLng).to.equal('da')
        })
      })

      describe('when session.lng is set and the browser sends other hints', function() {
        beforeEach(function(done) {
          this.req.session.lng = 'fr'
          this.req.headers['accept-language'] = 'da, en-gb;q=0.8, en;q=0.7'
          this.translations(this.req, this.res, done)
        })
        it('should preserve lng=fr in the session', function() {
          expect(this.req.session.lng).to.equal('fr')
        })
        it('should set lng to fr', function() {
          expect(this.req.lng).to.equal('fr')
        })
        it('should suggest the language from the browser hint', function() {
          expect(this.req.showUserOtherLng).to.equal('da')
        })
      })

      describe('when session.lng is set and the browser sends the same hints', function() {
        beforeEach(function(done) {
          this.req.session.lng = 'fr'
          this.req.headers['accept-language'] = 'fr, en-gb;q=0.8, en;q=0.7'
          this.translations(this.req, this.res, done)
        })
        it('should preserve lng=fr in the session', function() {
          expect(this.req.session.lng).to.equal('fr')
        })
        it('should set lng to fr', function() {
          expect(this.req.lng).to.equal('fr')
        })
        it('should not suggest any other language', function() {
          expect(this.req.showUserOtherLng).to.not.exist
        })
      })

      function checkLang(lng) {
        describe(`setGlobalLng=${lng}`, function() {
          beforeEach(function(done) {
            this.req.query.setGlobalLng = lng
            this.res.redirect.callsFake(() => done())
            this.translations(this.req, this.res, () => {})
          })
          it('should send the user back', function() {
            expect(this.res.redirect).to.have.been.calledWith(
              'https://www.sharelatex.com/login'
            )
          })
          it('should set the requested lang permanent', function() {
            expect(this.req.session.lng).to.equal(lng)
          })
        })
      }
      checkLang('da')
      checkLang('fr')

      describe('with additional query params', function() {
        beforeEach(function(done) {
          this.req.originalUrl = '/login?setGlobalLng=da&someKey=someValue'
          this.req.query.setGlobalLng = 'da'
          this.res.redirect.callsFake(() => done())
          this.translations(this.req, this.res, () => {})
        })
        it('should send the user back and preserve the query param', function() {
          expect(this.res.redirect).to.have.been.calledWith(
            'https://www.sharelatex.com/login?someKey=someValue'
          )
        })
        it('should set the requested lang permanent', function() {
          expect(this.req.session.lng).to.equal('da')
        })
      })

      describe('getTranslationUrl', function() {
        describe('with not query params', function() {
          beforeEach(function(done) {
            this.req.originalUrl = '/login'
            this.translations(this.req, this.res, done)
          })
          it('should set the setGlobalLng query param', function() {
            expect(
              this.res.locals.getTranslationUrl({
                lngCode: 'da',
                url: 'https://www.sharelatex.com'
              })
            ).to.equal('https://www.sharelatex.com/login?setGlobalLng=da')
          })
        })
        describe('with additional query params', function() {
          beforeEach(function(done) {
            this.req.originalUrl = '/login?someKey=someValue'
            this.translations(this.req, this.res, done)
          })
          it('should preserve the query param', function() {
            expect(
              this.res.locals.getTranslationUrl({
                lngCode: 'da',
                url: 'https://www.sharelatex.com'
              })
            ).to.equal(
              'https://www.sharelatex.com/login?someKey=someValue&setGlobalLng=da'
            )
          })
        })
      })
    })
  })
})