const Settings = require('@overleaf/settings')
const redis = require('@overleaf/redis-wrapper')

if (process.env.OL_MOCHA_UNIT_TEST_ARE_RUNNING) {
  // set by -> test/unit/bootstrap.js
  throw new Error(
    'It looks like unit tests are running, but you are connecting to Redis. Missing a stub?'
  )
}

// A per-feature interface to Redis,
// looks up the feature in `settings.redis`
// and returns an appropriate client.
// Necessary because we don't want to migrate web over
// to redis-cluster all at once.
module.exports = {
  // feature = 'websessions' | 'ratelimiter' | ...
  client(feature) {
    const redisFeatureSettings = Settings.redis[feature] || Settings.redis.web
    return redis.createClient(redisFeatureSettings)
  },
}
