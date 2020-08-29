const mongoose = require('mongoose')
const Settings = require('settings-sharelatex')
const logger = require('logger-sharelatex')

const POOL_SIZE = Settings.mongo.poolSize

if (process.env.OL_MOCHA_UNIT_TEST_ARE_RUNNING) {
  // set by -> test/unit/bootstrap.js
  throw new Error(
    'It looks like unit tests are running, but you are connecting to Mongo. Missing a stub?'
  )
}

const connectionPromise = mongoose.connect(Settings.mongo.url, {
  poolSize: POOL_SIZE,
  config: { autoIndex: false },
  useUnifiedTopology: !!Settings.mongo.useUnifiedTopology,
  useNewUrlParser: true,
  useFindAndModify: false,
  socketTimeoutMS: Settings.mongo.socketTimeoutMS,
  appname: 'web'
})

mongoose.connection.on('connected', () =>
  logger.log(
    {
      url: Settings.mongo.url,
      poolSize: POOL_SIZE
    },
    'mongoose default connection open'
  )
)

mongoose.connection.on('error', err =>
  logger.err({ err }, 'mongoose error on default connection')
)

mongoose.connection.on('disconnected', () =>
  logger.log('mongoose default connection disconnected')
)

if (process.env.MONGOOSE_DEBUG) {
  mongoose.set('debug', (collectionName, method, query, doc) =>
    logger.debug({ collectionName, method, query, doc }, 'mongoose debug')
  )
}

mongoose.plugin(schema => {
  schema.options.usePushEach = true
})

mongoose.Promise = global.Promise

async function getNativeDb() {
  const connection = await connectionPromise
  return connection.db
}

mongoose.getNativeDb = getNativeDb

module.exports = mongoose
