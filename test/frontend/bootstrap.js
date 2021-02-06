// Run babel on tests to allow support for import/export statements in Node
require('@babel/register')

// Load JSDOM to mock the DOM in Node
require('jsdom-global/register')

// Load sinon-chai assertions so expect(stubFn).to.have.been.calledWith('abc')
// has a nicer failure messages
const chai = require('chai')
chai.use(require('sinon-chai'))
chai.use(require('chai-as-promised'))

require('../../build/translations/generator').generateModuleInMemory('en')

const moment = require('moment')
moment.updateLocale('en', {
  calendar: {
    lastDay: '[Yesterday]',
    sameDay: '[Today]',
    nextDay: '[Tomorrow]',
    lastWeek: 'ddd, Do MMM YY',
    nextWeek: 'ddd, Do MMM YY',
    sameElse: 'ddd, Do MMM YY'
  }
})

let inMemoryLocalStorage = {}
global.localStorage = {
  // localStorage returns `null` when the item does not exist
  getItem: key =>
    inMemoryLocalStorage[key] !== undefined ? inMemoryLocalStorage[key] : null,
  setItem: (key, value) => (inMemoryLocalStorage[key] = value),
  clear: () => (inMemoryLocalStorage = {}),
  removeItem: key => delete inMemoryLocalStorage[key]
}

// node-fetch doesn't accept relative URL's: https://github.com/node-fetch/node-fetch/blob/master/docs/v2-LIMITS.md#known-differences
const fetch = require('node-fetch')
global.fetch = (url, ...options) => fetch('http://localhost' + url, ...options)

// Mock global settings
window.ExposedSettings = {}
