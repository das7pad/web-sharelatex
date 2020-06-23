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

const GLOBALS_USED_IN_PUG = ['Object', 'JSON']
const PUG_IIFE_START = ';var locals_for_with = (locals || {});(function ('
const PUG_IIFE_CALL = '}.call(this,'
const PUG_TEMPLATE_END = '\\u003E";'
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
    const blob = compileFile(filename).toString()

    // blob contains the template wrapped in https://www.npmjs.com/package/with
    // 'with' basically allows a mixed usage of locals and globals.
    // ------------------------------------------------------------------------
    // function template(locals) {\
    // var pug_html = "", pug_mixins = {}, pug_interp;\
    // ;var locals_for_with = (locals || {});(function (buildCssPath, ...\
    // , settings) {pug_html = "...";
    // pug_html = pug_html+"...body\u003E\u003C\u002Fhtml\u003E";}.call(this,\
    // "buildCssPath" in locals_for_with?locals_for_with.buildCssPath:\
    // typeof buildCssPath!=="undefined"?buildCssPath:undefined,\
    // ...\
    // "settings" in locals_for_with?locals_for_with.settings:\
    // typeof settings!=="undefined"?settings:undefined));;return pug_html;}
    // ------------------------------------------------------------------------
    // In production we do not need the logic of global lookups.
    // We will break the lookup down to a simple object unpack (Preserved;New).
    // ------------------------------------------------------------------------
    // function template(locals) {\                                   P
    // var pug_html = "", pug_mixins = {}, pug_interp;                P
    // let {buildCssPath,...,settings} = locals                       N
    // pug_html = "...";                                              P
    // pug_html = pug_html+"...body\u003E\u003C\u002Fhtml\u003E";     P
    // return pug_html}                                               N
    // ------------------------------------------------------------------------
    // Manipulating the function body is much simpler than replicating/stubbing
    //  pug internals to get the designated output right away.

    const withStart = blob.indexOf(PUG_IIFE_START)
    const varsStart = withStart + PUG_IIFE_START.length
    const varsEnd = blob.indexOf(')', varsStart)
    const vars = blob.slice(varsStart, varsEnd).split(', ')
    const localVars = vars.filter(
      varName => !GLOBALS_USED_IN_PUG.includes(varName)
    )

    const templateBodyStart = varsEnd + ') {'.length
    const templateBodyEnd =
      blob.indexOf(PUG_TEMPLATE_END + PUG_IIFE_CALL) + PUG_TEMPLATE_END.length

    return `\
const pug = require('pug-runtime')
module.exports = template
${blob.slice(0, withStart)}
let {${localVars.join(',')}} = locals
${blob.slice(templateBodyStart, templateBodyEnd)}
return pug_html}`
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
