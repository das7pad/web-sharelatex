const logger = require('logger-sharelatex')
const globby = require('globby')
const Settings = require('settings-sharelatex')
const fs = require('fs')
const Path = require('path')

// Generate list of view names from app/views

const viewList = globby
  .sync('app/views/**/*.pug', {
    onlyFiles: true,
    concurrency: 1,
    ignore: ['**/_*.pug', '**/_*/*.pug']
  })
  .concat(
    globby.sync('modules/*/app/views/**/*.pug', {
      onlyFiles: true,
      concurrency: 1,
      ignore: '**/_*.pug'
    })
  )
  .map(x => {
    return x.replace(/\.pug$/, '') // strip trailing .pug extension
  })
  .filter(x => {
    return !/^_/.test(x)
  })

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
  _persistGeneratedTemplate(view) {
    const body = this._generateTemplateModule(view)
    const dest = Path.join(GENERATED_VIEWS, view + '.js')
    fs.mkdirSync(Path.dirname(dest), { recursive: true, mode: 0o755 })
    fs.writeFileSync(dest, body, { mode: 0o644 })
  },
  persistGeneratedTemplates() {
    viewList.forEach(this._persistGeneratedTemplate.bind(this))
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

  precompileViews(app) {
    const startTime = Date.now()
    let success = 0
    let failures = 0
    viewList.forEach(view => {
      try {
        const filename = view + '.pug'
        compileFile(filename)
        logger.log({ view }, 'compiled')
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
