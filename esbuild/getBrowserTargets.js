const browserslist = require('browserslist')

const supportedBrowserNames = ['chrome', 'firefox', 'safari', 'edge']

function isBrowserSupported(browserIdentifier) {
  return supportedBrowserNames.some(browserName => {
    return browserIdentifier.startsWith(browserName)
  })
}

function translateToEsbuildTarget(browserIdentifier) {
  return browserIdentifier.replace(' ', '')
}

module.exports = browserslist(['last 1 year'])
  .filter(isBrowserSupported)
  .map(translateToEsbuildTarget)
