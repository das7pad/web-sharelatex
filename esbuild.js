const http = require('http')
const Path = require('path')
const esbuild = require('esbuild')
const BROWSER_TARGETS = require('./esbuild/getBrowserTargets')
const valLoader = require('./esbuild/plugins/valLoader')
const {
  CONFIGS,
  MAIN_BUNDLES_CONFIG,
  inflateConfig
} = require('./esbuild/configs')
const {
  handleEventSourceRequest,
  notifyFrontendAboutRebuild
} = require('./esbuild/autoReload')
const { handleRequest, trackOutput } = require('./esbuild/inMemory')
const { manifest, writeManifest } = require('./esbuild/writeManifest')

function logWithTimestamp(...args) {
  console.error(`[${new Date().toISOString()}]`, ...args)
}

async function onRebuild(name, error, result) {
  notifyFrontendAboutRebuild(name, error, result)
  if (error) {
    logWithTimestamp('watch build failed.')
    return
  }

  logWithTimestamp('watch build succeeded.')

  trackOutput(name, result.outputFiles)
  try {
    await writeManifest(result.metafile)
  } catch (error) {
    logWithTimestamp('writing manifest failed in watch mode:', error)
  }
}

function trackDurationInMS() {
  const t0 = process.hrtime()
  return function() {
    const [s, ns] = process.hrtime(t0)
    return (s * 1e9 + ns) / 1e6
  }
}

async function buildConfig({ isWatchMode, inMemory, autoReload }, cfg) {
  cfg = inflateConfig(cfg)
  const { DESCRIPTION } = cfg
  delete cfg.DESCRIPTION

  if (isWatchMode) {
    cfg.watch = {
      async onRebuild(error, result) {
        await onRebuild(DESCRIPTION, error, result)
      }
    }
  }
  if (inMemory) {
    cfg.write = false
  }
  if (autoReload && DESCRIPTION === 'main bundles') {
    cfg.inject.push(Path.join(__dirname, 'esbuild/inject/listenForRebuild.js'))
  }

  const done = trackDurationInMS()
  const { metafile, outputFiles } = await esbuild.build(cfg)
  const duration = done()

  trackOutput(DESCRIPTION, outputFiles)
  await writeManifest(metafile, inMemory)
  return { DESCRIPTION, duration }
}

async function buildAllConfigs(options) {
  const done = trackDurationInMS()
  const timings = await Promise.all(
    CONFIGS.map(cfg => buildConfig(options, cfg))
  )
  const duration = done()
  timings.push({ DESCRIPTION: 'total', duration })
  return timings
}

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

async function buildTestBundle(entrypoint, platform, target) {
  const OUTPUT_PATH = Path.join('/tmp', 'web', 'testBundle', platform)
  const { define, inject, plugins, loader } = MAIN_BUNDLES_CONFIG
  const cfg = {
    entryNames: '[dir]/[name]',
    entryPoints: [entrypoint],
    plugins: [
      valLoader(Path.join(__dirname, 'test/frontend/allTests.js')),
      valLoader(Path.join(__dirname, 'test/karma/allTests.js')),
      ...plugins
    ],
    outdir: OUTPUT_PATH,
    platform,
    target,
    define,
    inject,
    loader
  }

  try {
    await esbuild.build(inflateConfig(cfg))
  } catch (error) {
    console.error('esbuild error:', error)
    throw new Error(`esbuild failed: ${error.message}`)
  }
  return Path.join(OUTPUT_PATH, Path.basename(entrypoint))
}

async function buildTestBundleForBrowser(entrypoint) {
  return buildTestBundle(entrypoint, 'browser', BROWSER_TARGETS)
}

async function buildTestBundleForNode(entrypoint) {
  // process.version is v prefixed -- e.g. v14.16.0
  const nodeVersion = process.version.slice(1)
  return buildTestBundle(entrypoint, 'node', `node${nodeVersion}`)
}

module.exports = {
  watchAndServe,
  buildTestBundleForBrowser,
  buildTestBundleForNode
}

if (require.main === module) {
  const ACTION = process.argv.pop()

  if (ACTION === 'build') {
    buildAllConfigs({ isWatchMode: false })
      .then(timings => {
        console.table(timings)
        console.error('esbuild build succeeded.')
        process.exit(0)
      })
      .catch(error => {
        console.error('esbuild build failed:', error)
        process.exit(1)
      })
  } else if (ACTION === 'watch') {
    buildAllConfigs({ isWatchMode: true })
      .then(() => {
        logWithTimestamp('esbuild is ready in watch mode.')
      })
      .catch(error => {
        console.error('esbuild initial build in watch mode failed:', error)
        process.exit(1)
      })
  } else {
    console.error(`unknown action: ${JSON.stringify(ACTION)}`)
    process.exit(101)
  }
}
