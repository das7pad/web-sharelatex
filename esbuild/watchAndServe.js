const http = require('http')
const { handleEventSourceRequest } = require('./autoReload')
const { buildAllConfigs } = require('./build')
const { handleRequest } = require('./inMemory')
const { logWithTimestamp } = require('./utils')
const { manifest } = require('./writeManifest')

function watchAndServe(options) {
  const initialBuild = buildAndWatch(options)
  const address = startServer(initialBuild, options)

  return { manifest, address, initialBuild }
}

function startServer(initialBuild, { host, port, proxyForInMemoryRequests }) {
  // Assume that the proxy sets all the CORS headers.
  const setCORSHeader = !proxyForInMemoryRequests

  const server = http
    .createServer(async (request, response) => {
      if (setCORSHeader) {
        response.setHeader(
          'Access-Control-Allow-Origin',
          request.headers.origin || '*'
        )
      }

      // Wait for the initial build to finish before processing requests.
      await initialBuild

      if (request.url.endsWith('/event-source')) {
        await handleEventSourceRequest(request, response)
      } else {
        await handleRequest(request, response)
      }
    })
    .listen(port, host)

  return server.address()
}

function buildAndWatch({ autoReload }) {
  return buildAllConfigs({
    isWatchMode: true,
    inMemory: true,
    autoReload
  })
    .then(() => {
      logWithTimestamp('esbuild is ready in watch-and-serve mode.')
    })
    .catch(error => {
      console.error(
        'esbuild initial build in watch-and-serve mode failed:',
        error
      )
      process.exit(1)
    })
}

module.exports = { watchAndServe }
