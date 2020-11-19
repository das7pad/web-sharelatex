const eastMongo = require('east-mongo')

const Settings = require('settings-sharelatex')

function Adapter(params) {
  params = params || {}
  Object.assign(params, Settings.mongo)
  eastMongo.call(this, params)
}
require('util').inherits(Adapter, eastMongo)
module.exports = Adapter
