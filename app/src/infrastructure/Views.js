const logger = require('logger-sharelatex')
const glob = require('glob')
const Settings = require('settings-sharelatex')
const fs = require('fs')
const Path = require('path')

// Generate list of view names from app/views

const viewList = glob
  .sync('{,modules/*/}app/views/**/*.pug', {
    ignore: ['**/_*.pug', '**/_*/**/*.pug']
  })
  .map(x => x.replace(/\.pug$/, '')) // strip trailing .pug extension

const GENERATED_VIEWS = Path.join(__dirname, '../../../generated/views')

function compileFile(filename) {
  const pug = require('pug')
  return pug.compileFile(Path.resolve(filename), {
    cache: true,
    compileDebug: Settings.debugPugTemplates
  })
}

const templates = new Map()
module.exports = {
  _generateTemplateModule(view) {
    const filename = view + '.pug'
    return (
      "const pug = require('pug-runtime');module.exports = template;" +
      compileFile(filename).toString()
    )
  },
  persistGeneratedTemplate(view) {
    const body = this._generateTemplateModule(view)
    const dest = Path.join(GENERATED_VIEWS, view + '.js')
    fs.mkdirSync(Path.dirname(dest), { recursive: true, mode: 0o755 })
    fs.writeFileSync(dest, body, { mode: 0o644 })
  },
  persistGeneratedTemplates() {
    viewList.forEach(this.persistGeneratedTemplate.bind(this))
  },
  getTemplate(path) {
    return templates.get(path)
  },
  loadPrecompiledViews(app) {
    app.engines['.pug'] = (path, locals, callback) => {
      const template = templates.get(path)
      // express already has a try/catch around us
      callback(null, template(locals))
    }

    viewList.forEach(view => {
      const filename = view + '.pug'
      templates.set(
        Path.resolve(filename),
        require(Path.join(GENERATED_VIEWS, view + '.js'))
      )
    })
  },

  precompileView(view) {
    const filename = view + '.pug'
    compileFile(filename)
    logger.log({ view }, 'compiled')
  },
  precompileViews(app) {
    const startTime = Date.now()
    let success = 0
    let failures = 0
    viewList.forEach(view => {
      try {
        this.precompileView(view)
        success++
      } catch (err) {
        logger.error({ view, err: err.message }, 'error compiling')
        failures++
      }
    })
    logger.log(
      { timeTaken: Date.now() - startTime, failures, success },
      'compiled templates'
    )
    return failures
  }
}

if (!module.parent) {
  if (process.argv.length === 3) {
    try {
      module.exports.precompileView(process.argv[2])
    } catch (err) {
      logger.fatal({ err }, 'compile failed')
      process.exit(1)
    }
    try {
      module.exports.persistGeneratedTemplate(process.argv[2])
    } catch (err) {
      logger.fatal({ err }, 'persisting failing')
      process.exit(2)
    }
    process.exit(0)
  }

  if (module.exports.precompileViews()) {
    logger.fatal({}, 'compile failed')
    process.exit(1)
  }
  try {
    module.exports.persistGeneratedTemplates()
  } catch (err) {
    logger.fatal({ err }, 'persisting failing')
    process.exit(2)
  }
}
