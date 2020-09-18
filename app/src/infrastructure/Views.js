const glob = require('glob')
const Settings = require('settings-sharelatex')
const Path = require('path')

function getBuiltViewList() {
  const ROOT = Path.join(__dirname, '../../..')
  const GENERATED_VIEWS = Path.join(__dirname, '../../../generated/views')

  function getView(file) {
    return file.replace(GENERATED_VIEWS, ROOT).replace(/\.js/, '')
  }
  return glob.sync(`${GENERATED_VIEWS}/**/*.js`).map(builtViewPath => {
    return { view: getView(builtViewPath), builtViewPath }
  })
}

const preloadedTemplates = new Map()
module.exports = {
  generateTemplate(view) {
    // block compiles at runtime when there are existing preloaded templates
    if (preloadedTemplates.size) {
      throw new Error(`template not preloaded: ${view}`)
    }
    return require('../../../build/views/generator').generateModuleInMemory({
      view,
      cache: false,
      debug: Settings.debugPugTemplates
    })
  },
  getTemplate(view) {
    return preloadedTemplates.get(view + '.pug') || this.generateTemplate(view)
  },
  loadPrecompiledViews(app) {
    app.engines['.pug'] = (path, locals, callback) => {
      const template = preloadedTemplates.get(path)
      // express already has a try/catch around us
      callback(null, template(locals))
    }

    getBuiltViewList().forEach(({ view, builtViewPath }) => {
      preloadedTemplates.set(view + '.pug', require(builtViewPath))
    })
  },

  precompileViews(app) {
    require('../../../build/views').processViews({
      write: false,
      cache: true,
      debug: Settings.debugPugTemplates
    })
  }
}
