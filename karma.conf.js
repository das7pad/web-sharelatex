const fs = require('fs')
const Path = require('path')
const webpack = require('webpack')

const webpackConfig = require('./webpack.config.test')
const OUTPUT_PATH = webpackConfig.output.path

let junitDest
const reporters = ['mocha']
if (process.env.HOME === '/home/node') {
  // assume CI
  junitDest = '/home/node/karma.xml'
  reporters.push('junit')
}

module.exports = function(config) {
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
      'test/karma/import_tests.js'
    ],
    middleware: ['fake-img'],
    preprocessors: {
      // Run files through webpack
      'test/karma/import_tests.js': ['webpack']
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
      { 'preprocessor:webpack': ['factory', webpackPreprocessorFactory] }
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
  return function(req, res, next) {
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
function webpackPreprocessorFactory() {
  const compiler = webpack(webpackConfig)

  return function webpackPreprocessor(content, file, done) {
    console.error('webpack: start compiling')
    compiler.run(error => {
      if (error) {
        console.error('webpack: error compiling', error)
        return done(error)
      }
      console.error('webpack: done compiling')
      fs.readFile(Path.join(OUTPUT_PATH, 'import_tests.js'), done)
    })
  }
}
