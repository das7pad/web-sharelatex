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
Object.defineProperty(global, 'localStorage', {
  value: {
    // localStorage returns `null` when the item does not exist
    getItem: key =>
      inMemoryLocalStorage[key] !== undefined
        ? inMemoryLocalStorage[key]
        : null,
    setItem: (key, value) => (inMemoryLocalStorage[key] = value),
    clear: () => (inMemoryLocalStorage = {}),
    removeItem: key => delete inMemoryLocalStorage[key]
  },
  writable: true
})

// node-fetch doesn't accept relative URL's: https://github.com/node-fetch/node-fetch/blob/master/docs/v2-LIMITS.md#known-differences
const fetch = require('node-fetch')
global.fetch = (url, ...options) => fetch('http://localhost' + url, ...options)

// Mock global settings
function insertMeta(name, content) {
  const meta = document.createElement('meta')
  meta.name = name
  meta.content = content
  if (typeof content === 'boolean') {
    meta.setAttribute('data-type', 'boolean')
  }
  if (typeof content === 'object') {
    meta.setAttribute('data-type', 'json')
  }
  if (typeof content === 'number') {
    meta.setAttribute('data-type', 'json')
  }
  document.head.appendChild(meta)
}
insertMeta('ol-appName', 'Overleaf')
insertMeta('ol-maxEntitiesPerProject', 10)
insertMeta('ol-maxUploadSize', 5 * 1024 * 1024)

// Work around bundler hack in react-dom
// esbuild does not populate the obfuscated require call when bundling.
// https://github.com/facebook/react/blob/f04bcb8139cfa341640ea875c2eae15523ae9cd9/packages/shared/enqueueTask.js#L14-L47
const { MessageChannel } = require('worker_threads')
global.MessageChannel = MessageChannel
