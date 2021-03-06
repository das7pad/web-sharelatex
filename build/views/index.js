const logger = require('logger-sharelatex')
const glob = require('glob')
const fs = require('fs')
const Path = require('path')

const Generator = require('./generator')
const ROOT = `${__dirname}/../../`
const TARGET_DIRECTORY = `${__dirname}/../../generated/views`

function writeFile(view, blob) {
  const file = `${TARGET_DIRECTORY}/${view}.js`
  fs.mkdirSync(Path.dirname(file), { recursive: true, mode: 0o755 })
  fs.writeFileSync(file, blob, { mode: 0o644 })
}

function getAvailableViews() {
  if (process.argv.length === 3) {
    return [process.argv[2]]
  }

  function stripExtension(file) {
    return file.replace(/\.pug$/, '')
  }
  return glob
    .sync('{,modules/*/}app/views/**/*.pug', {
      cwd: ROOT,
      ignore: ['**/_*.pug', '**/_*/**/*.pug']
    })
    .map(stripExtension)
}

function processViews({ write, debug }) {
  const startTime = Date.now()
  let success = 0
  let failures = 0
  getAvailableViews().forEach(view => {
    try {
      const blob = Generator.generateModule({
        path: view + '.pug',
        debug
      })
      logger.log({ view }, 'generated view')
      if (write) writeFile(view, blob)
      success++
    } catch (err) {
      logger.error({ view, err }, 'error generating view')
      failures++
    }
  })
  const timeTaken = Date.now() - startTime
  logger.log({ timeTaken, failures, success }, 'compiled templates')
  return failures
}

function main() {
  const failures = processViews({
    write: process.env.DRY_RUN !== 'true',
    debug: process.env.DEBUG_VIEWS === 'true'
  })
  process.exit(failures)
}

if (!module.parent) {
  main()
}

module.exports = {
  processViews
}
