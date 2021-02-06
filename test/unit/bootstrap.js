const chai = require('chai')
const sinon = require('sinon')

// add chai.should()
chai.should()

// Load sinon-chai assertions so expect(stubFn).to.have.been.calledWith('abc')
// has a nicer failure messages
chai.use(require('sinon-chai'))

// Load promise support for chai
chai.use(require('chai-as-promised'))

// Do not truncate assertion errors
chai.config.truncateThreshold = 0

// add support for mongoose in sinon
require('sinon-mongoose')

afterEach(function() {
  sinon.restore()
})

const SandboxedModule = require('sandboxed-module')
const PromisesUtils = require('../../app/src/util/promises')
const Errors = require('../../app/src/Features/Errors/Errors')
const GLOBAL_REQUIRE_CACHE_FOR_SANDBOXED_MODULES = {
  // Translations dependency
  '../../../build/translations/generator': require('../../build/translations/generator'),

  // cache p-limit for all expressify/promisifyAll users
  '../../util/promises': PromisesUtils,
  '../../../../app/src/util/promises': PromisesUtils,

  // Errors are widely used and instance checks need the exact same prototypes
  '../Errors/Errors': Errors,
  '../../../../app/src/Features/Errors/Errors': Errors,
  '../../../../../app/src/Features/Errors/Errors': Errors
}
const LIBRARIES = [
  '@overleaf/o-error',
  'async',
  'lodash',
  'moment',
  'underscore',
  'xml2js',
  'json2csv',
  'sanitize-html',
  'marked'
]
LIBRARIES.forEach(lib => {
  GLOBAL_REQUIRE_CACHE_FOR_SANDBOXED_MODULES[lib] = require(lib)
})

SandboxedModule.configure({
  requires: GLOBAL_REQUIRE_CACHE_FOR_SANDBOXED_MODULES
})

// sandboxed-module somehow registers every fake module it creates in this
// module's children array, which uses quite a big amount of memory. We'll take
// a copy of the module children array and restore it after each test so that
// the garbage collector has a chance to reclaim the fake modules.
let initialModuleChildren
before('record initial module children', function() {
  initialModuleChildren = module.children.slice()
})

afterEach('restore module children', function() {
  // Delete leaking sandboxed modules
  module.children = initialModuleChildren.slice()
})

// used by -> app/src/infrastructure/Mongoose.js
process.env.OL_MOCHA_UNIT_TEST_ARE_RUNNING = 'true'
