const eastMongo = require('east-mongo')

const Settings = require('settings-sharelatex')

function Adapter(params) {
  params = params || {}
  params.url = params.url || Settings.mongo.url
  eastMongo.call(this, params)
}
require('util').inherits(Adapter, eastMongo)
module.exports = Adapter
