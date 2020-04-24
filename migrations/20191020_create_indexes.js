const async = require('async')
const fs = require('fs')
const logger = require('logger-sharelatex')
const Path = require('path')

logger.initialize(`migration:${Path.basename(__filename, '.js')}`)

const modelsSrcPath = Path.join(__dirname, '../app/src/models')

exports.migrate = function(client, done) {
  const models = fs.readdirSync(modelsSrcPath).map(function(name) {
    return name.slice(0, -3)
  })
  logger.info({ models }, 'queue')
  async.eachSeries(
    models,
    function(modelName, cb) {
      logger.info({ modelName }, 'started')

      const model = require(Path.join(modelsSrcPath, modelName))[modelName]
      model.createIndexes(function(err) {
        if (err) {
          logger.error({ modelName, err }, 'failed')
        } else {
          logger.info({ modelName }, 'completed')
        }
        cb(err)
      })
    },
    function() {
      logger.info({ models }, 'done')
      done()
    }
  )
}

exports.rollback = function(client, done) {
  logger.warn('refusing to delete indexes')
  done()
}
