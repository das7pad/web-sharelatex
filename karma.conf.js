const fs = require('fs')
const { buildTestBundleForBrowser } = require('./esbuild/buildCI')
let junitDest
const reporters = ['mocha']
if (process.env.HOME === '/home/node') {
  // assume CI
  junitDest = '/home/node/karma.xml'
  reporters.push('junit')
}

module.exports = function (config) {
  config.set({
    customLaunchers: {
      ChromeCustom: {
        base: 'ChromeHeadless',
        // We must disable the Chrome sandbox when running Chrome inside Docker
        // (Chrome's sandbox needs more permissions than Docker allows by
        // default)
        flags: ['--no-sandbox']
      }
    },
    browsers: ['ChromeCustom'],
    files: [
      // Import all tests (see comment in the file for why this is necessary)
      'test/karma/entrypoint.js'
    ],
    middleware: ['fake-img'],
    preprocessors: {
      // Run files through esbuild
      'test/karma/entrypoint.js': ['esbuild']
    },
    frameworks: ['mocha', 'chai-sinon'],
    // Configure the webpack dev server used to serve test files
    plugins: [
      require('karma-chrome-launcher'),
      require('karma-mocha'),
      require('karma-chai-sinon'),
      require('karma-mocha-reporter'),
      require('karma-junit-reporter'),
      { 'middleware:fake-img': ['factory', fakeImgMiddlewareFactory] },
      { 'preprocessor:esbuild': ['factory', esBuildPreprocessorFactory] }
    ],
    reporters: reporters,
    junitReporter: {
      outputFile: junitDest
    }
  })
}

/**
 * Handle fake images
 */
function fakeImgMiddlewareFactory() {
  return function (req, res, next) {
    if (req.originalUrl.startsWith('/fake/')) {
      return res.end('fake img response')
    }
    if (req.originalUrl.endsWith('style.css')) {
      return res.end('')
    }
    if (req.originalUrl.toLowerCase().includes('mathjax')) {
      return res.end('')
    }
    next()
  }
}
function esBuildPreprocessorFactory() {
  return function esbuildPreprocessor(content, { path: srcPath }, done) {
    console.error('esbuild: start compiling')
    buildTestBundleForBrowser(srcPath)
      .then(bundlePath => {
        console.error('esbuild: done compiling')
        fs.readFile(bundlePath, done)
      })
      .catch(error => {
        console.error('esbuild: error compiling', error)
        done(error)
      })
  }
}
