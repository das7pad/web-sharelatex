const glob = require('glob')
const Settings = require('@overleaf/settings')
const Path = require('path')

const DEBUG_VIEWS = Boolean(Settings.debugPugTemplates)
const CACHE_VIEWS = ['production', 'test'].includes(process.env.NODE_ENV)
const LOAD_PRECOMPILED_VIEWS = Boolean(Settings.loadPrecompiledPugViews)

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

const CACHED_TEMPLATES = new Map()
function generateTemplate(path) {
  // Load the generator ad-hoc in development.
  // In production we do not ship 'pug' -- which is needed for generating
  //  templates --, but just 'pug-runtime' which can render templates.
  return require('../../../build/views/generator').generateModuleInMemory({
    path,
    debug: DEBUG_VIEWS
  })
}

function getTemplate(path) {
  const cachedTemplate = CACHED_TEMPLATES.get(path)
  if (cachedTemplate) return cachedTemplate

  if (LOAD_PRECOMPILED_VIEWS) {
    // block compiles at runtime when preloading templates
    throw new Error(`template not preloaded: ${path}`)
  }

  const generatedTemplate = generateTemplate(path)
  if (CACHE_VIEWS) {
    CACHED_TEMPLATES.set(path, generatedTemplate)
  }
  return generatedTemplate
}

function loadPrecompiledViews(app) {
  app.engines['.pug'] = function render(path, locals, callback) {
    const template = CACHED_TEMPLATES.get(path)
    // express already has a try/catch wrapper around this invocation.
    // There is no need for any error handling in here.
    callback(null, template(locals))
  }

  getBuiltViewList().forEach(({ pugViewPath, builtViewPath }) => {
    CACHED_TEMPLATES.set(pugViewPath, require(builtViewPath))
  })
}

function generateViewsAtRuntime(app) {
  app.engines['.pug'] = function render(path, locals, callback) {
    const template = getTemplate(path)
    // express already has a try/catch wrapper around this invocation.
    // There is no need for any error handling in here.
    callback(null, template(locals))
  }
}

function setup(app) {
  if (LOAD_PRECOMPILED_VIEWS) {
    loadPrecompiledViews(app)
  } else {
    generateViewsAtRuntime(app)
  }
  if (CACHE_VIEWS) {
    // Cache express internals
    app.enable('view cache')
  }
}

module.exports = {
  CACHE_VIEWS,
  getTemplate,
  setup
}
