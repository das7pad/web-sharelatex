/* eslint-disable
    no-return-assign,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const SandboxedModule = require('sandboxed-module')
const assert = require('assert')
require('chai').should()
const sinon = require('sinon')
const modulePath = require('path').join(
  __dirname,
  '../../../../app/js/Features/Referal/ReferalController.js'
)

describe('Referal controller', () =>
  beforeEach(function() {
    return (this.controller = SandboxedModule.require(modulePath, {
      requires: {
        'logger-sharelatex': {
          log() {},
          err() {}
        }
      }
    }))
  }))
