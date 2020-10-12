const glob = require('glob')
const Settings = require('settings-sharelatex')
const Path = require('path')

function getBuiltViewList() {
  const ROOT = Path.join(__dirname, '../../..')
  const GENERATED_VIEWS = Path.join(__dirname, '../../../generated/views')

  return glob.sync(`${GENERATED_VIEWS}/**/*.js`).map(builtViewPath => {
    // rebase onto ROOT and replace the '.js' extension with '.pug'
    // builtViewPath: /app/generated/views/app/views/user/login.js
    // pugViewPath:                   /app/app/views/user/login.pug
    const pugViewPath = builtViewPath
      .replace(new RegExp(`^${GENERATED_VIEWS}`), ROOT)
      .replace(/\.js$/, '.pug')
    return { pugViewPath, builtViewPath }
  })
}

const preloadedTemplates = new Map()
function generateTemplate(path) {
  // block compiles at runtime when there are existing preloaded templates
  if (preloadedTemplates.size) {
    throw new Error(`template not preloaded: ${path}`)
  }
  // Load the generator ad-hoc in development.
  // In production we do not ship 'pug', but just 'pug-runtime'.
  return require('../../../build/views/generator').generateModuleInMemory({
    path,
    cache: false,
    debug: Settings.debugPugTemplates
  })
}

function getTemplate(path) {
  return preloadedTemplates.get(path) || generateTemplate(path)
}

function loadPrecompiledViews(app) {
  app.engines['.pug'] = function render(path, locals, callback) {
    const template = preloadedTemplates.get(path)
    // express already has a try/catch wrapper around this invocation.
    // There is no need for any error handling in here.
    callback(null, template(locals))
  }

  getBuiltViewList().forEach(({ pugViewPath, builtViewPath }) => {
    preloadedTemplates.set(pugViewPath, require(builtViewPath))
  })
}

function precompileViews() {
  require('../../../build/views').processViews({
    write: false,
    cache: true,
    debug: Settings.debugPugTemplates
  })
}

module.exports = {
  getTemplate,
  loadPrecompiledViews,
  precompileViews
}
