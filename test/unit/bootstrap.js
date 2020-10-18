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
const GLOBAL_REQUIRE_CACHE_FOR_SANDBOXED_MODULES = {
  // Translations dependency
  '../../../build/translations/generator': require('../../build/translations/generator'),
  // cache p-limit for all expressify/promisifyAll users
  '../../util/promises': require('../../app/src/util/promises'),
  // Errors are widely used and instance checks need the exact same prototypes
  '../Errors/Errors': require('../../app/src/Features/Errors/Errors')
}
const LIBRARIES = [
  '@overleaf/o-error',
  'async',
  'lodash',
  'moment',
  'underscore',
  'xml2js',
  'json2csv'
]
LIBRARIES.forEach(lib => {
  GLOBAL_REQUIRE_CACHE_FOR_SANDBOXED_MODULES[lib] = require(lib)
})

SandboxedModule.configure({
  requires: GLOBAL_REQUIRE_CACHE_FOR_SANDBOXED_MODULES
})

// used by -> app/src/infrastructure/Mongoose.js
process.env.OL_MOCHA_UNIT_TEST_ARE_RUNNING = 'true'
