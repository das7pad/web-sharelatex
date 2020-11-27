let Modules
const Path = require('path')
const glob = require('glob')
const Views = require('./Views')
const async = require('async')
const Settings = require('@overleaf/settings')

module.exports = Modules = {
  modules: [],
  loadModules() {
    glob
      .sync(`${__dirname}/../../../modules/*/index.js`)
      .map(Path.dirname)
      .forEach(modulePath => {
        const loadedModule = require(modulePath)
        loadedModule.path = modulePath
        this.modules.push(loadedModule)
      })
    Modules.attachHooks()
  },

  applyRouter(webRouter, privateApiRouter, publicApiRouter) {
    for (const module of this.modules) {
      if (module.router && typeof module.router.apply === 'function') {
        module.router.apply(webRouter, privateApiRouter, publicApiRouter)
      }
    }
  },

  applyNonCsrfRouter(webRouter, privateApiRouter, publicApiRouter) {
    for (const module of this.modules) {
      if (module.nonCsrfRouter) {
        module.nonCsrfRouter.apply(webRouter, privateApiRouter, publicApiRouter)
      }
      if (
        module.router &&
        typeof module.router.applyNonCsrfRouter === 'function'
      ) {
        module.router.applyNonCsrfRouter(
          webRouter,
          privateApiRouter,
          publicApiRouter
        )
      }
    }
  },

  attachViewIncludesReloadMiddleware(webRouter) {
    if (Settings.reloadModuleViewsOnEachRequest) {
      webRouter.use((req, res, next) => {
        const actualRender = res.render
        res.render = function() {
          Modules.loadViewIncludes()
          actualRender.apply(res, arguments)
        }
        next()
      })
    }
  },

  viewIncludes: new Map(),
  loadViewIncludes() {
    this.viewIncludes.clear()
    for (const module of this.modules) {
      Object.entries(module.viewIncludes || {}).forEach(
        ([viewInclude, partial]) => {
          if (!this.viewIncludes.has(viewInclude)) {
            this.viewIncludes.set(viewInclude, [])
          }
          const path = Path.join(module.path, 'app/views', partial + '.pug')
          const template = Views.getTemplate(path)
          this.viewIncludes.get(viewInclude).push(template)
        }
      )
    }
  },

  moduleIncludes(view, locals) {
    const compiledPartials = Modules.viewIncludes.get(view) || []
    return compiledPartials.reduce(
      (html, compiledPartial) => html + compiledPartial(locals),
      ''
    )
  },

  moduleIncludesAvailable(view) {
    return Modules.viewIncludes.has(view)
  },

  linkedFileAgentsIncludes() {
    const agents = {}
    for (const module of this.modules) {
      Object.entries(module.linkedFileAgents || {}).forEach(
        ([name, agentFunction]) => {
          agents[name] = agentFunction()
        }
      )
    }
    return agents
  },

  attachHooks() {
    for (const module of this.modules) {
      Object.entries(module.hooks || {}).forEach(([hook, method]) => {
        Modules.hooks.attach(hook, method)
      })
    }
  },

  hooks: {
    _hooks: new Map(),
    attach(name, method) {
      if (!this._hooks.has(name)) {
        this._hooks.set(name, [])
      }
      this._hooks.get(name).push(method)
    },

    fire(name, ...args) {
      const callback = args.pop()
      const methods = this._hooks.get(name) || []
      function fanOut(method, cb) {
        method(...args, cb)
      }
      async.mapSeries(methods, fanOut, callback)
    }
  }
}

Modules.loadModules()
