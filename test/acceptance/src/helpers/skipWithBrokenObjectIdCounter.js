/*
  There goes my evening :/
  I observed strange behavior of `db.col.find(...).sort({ _id: 1 })` not
   behaving as expected.
  Inserting two newly generated ObjectIds from the same process, generated
   sequentially, synchronously, you name it, and querying the db for them
   could return id1 OR id2 first.
  This caused a bunch of acceptance tests to become flaky.
  Here is the fun part: Running the acceptance tests locally works 100% of the
   time. Running them in CI is flaky. This slowed down debugging a lot.
  Up on a deep dive into the tests/scripts and careful inspection of ids,
   I could see that the counter component of the IDs is properly incremented.
  But some part in the middle is jumping around, getting set in an apparently
   random fashion.
  Taking a look at the bson Github repository showed a module-global, random
   bytes buffer that gets copied at ObjectId generation into the new id.
  A dead end. Almost, the ObjectId spec has changed between the latest version
   of bson and the bson version used in mongodb package. Bummer.
  I was looking at v4 and v1 is used in the mongodb driver v3.6 (latest).
   v1 has a PID field in the middle of an id.
  The PID should always be static on the main thread of a NodeJS/v8 process,
   no?
  Yes, it's static, but the mongo folks made it dynamic in a Docker env [1].
  Specifically when the pid is 1.
  A poor detection to be honest, local and CI runs both leverage docker
   container.
  The CI variant of the tests starts NodeJS as pid 1 (ha!) and the local run
   goes through an npm script and the pid is 19 in a few test runs.

  We are now skipping a bunch of (flaky) tests in case the ObjectIds have a
   moving part in the middle of them and hence do not correspond to strictly
   sequential entities per process that we can sort in mongo.

  Bytes 7 and 8 are the PID field in v1 [2] and in v4 they are part of the
   module-global Buffer (which is static per process life-cycle) [3].

  [1] https://github.com/mongodb/js-bson/pull/213
  [2] https://github.com/mongodb/js-bson/blob/6fc7a87d64369cdb64719f0de944d6aa3c70ee75/lib/bson/objectid.js#L174-L175
  [3] https://github.com/mongodb/js-bson/blob/99722f66d9f5eeb0ab57e74bab26049a425fa3e8/src/objectid.ts#L183-L184
 */

const { ObjectId } = require('mongodb')

function getPidComponent(id) {
  return Buffer.from(id.toString(), 'hex').slice(7, 8).toString('hex')
}

const BROKEN_OBJECT_ID_COUNTER =
  new Set(
    Array(42)
      .fill(42)
      .map(() => ObjectId())
      .map(getPidComponent)
  ).size > 1

if (BROKEN_OBJECT_ID_COUNTER) {
  console.error('ObjectId() does not generate sequential ids per process.')
  console.error('Skipping a bunch of flaky tests :/ Run locally for full set.')
}

function skipWithBrokenObjectIdCounter() {
  if (!BROKEN_OBJECT_ID_COUNTER) return
  before(function () {
    this.skip()
  })
}

module.exports = { BROKEN_OBJECT_ID_COUNTER, skipWithBrokenObjectIdCounter }
