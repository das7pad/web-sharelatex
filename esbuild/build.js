const Path = require('path')
const esbuild = require('esbuild')
const { notifyFrontendAboutRebuild } = require('./autoReload')
const { CONFIGS, inflateConfig } = require('./configs')
const { trackOutput } = require('./inMemory')
const { logWithTimestamp, trackDurationInMS } = require('./utils')
const { writeManifest } = require('./writeManifest')

const ROOT = Path.dirname(__dirname)

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

async function buildConfig({ isWatchMode, inMemory, autoReload }, cfg) {
  cfg = inflateConfig(cfg)
  const { DESCRIPTION } = cfg
  delete cfg.DESCRIPTION

  if (isWatchMode) {
    cfg.watch = {
      async onRebuild(error, result) {
        await onRebuild(DESCRIPTION, error, result)
      },
    }
  }
  if (inMemory) {
    cfg.write = false
  }
  if (autoReload && DESCRIPTION === 'main bundles') {
    cfg.inject.push(Path.join(ROOT, 'esbuild/inject/listenForRebuild.js'))
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

module.exports = {
  buildAllConfigs,
}
