const SandboxedModule = require('sandboxed-module')
const modulePath = require('path').join(
  __dirname,
  '../../../../app/src/Features/Referal/ReferalController'
)

describe('Referal controller', function() {
  beforeEach(function() {
    this.controller = SandboxedModule.require(modulePath, {})
  })
})
