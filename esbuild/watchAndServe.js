const http = require('http')
const { handleEventSourceRequest } = require('./autoReload')
const { buildAllConfigs } = require('./build')
const { handleRequest } = require('./inMemory')
const { logWithTimestamp } = require('./utils')
const { manifest } = require('./writeManifest')

function watchAndServe({ host, port, proxyForInMemoryRequests, autoReload }) {
  const server = http
    .createServer((request, response) => {
      if (setCORSHeader) {
        response.setHeader(
          'Access-Control-Allow-Origin',
          request.headers.origin || '*'
        )
      }
      if (request.url.endsWith('/event-source')) {
        return handleEventSourceRequest(request, response)
      }
      return handleRequest(request, response)
    })
    .listen(port, host)
  const address = server.address()
  // Assume that the proxy sets all the CORS headers.
  const setCORSHeader = !proxyForInMemoryRequests

  const initialBuild = buildAllConfigs({
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

  return { manifest, address, initialBuild }
}

module.exports = { watchAndServe }
