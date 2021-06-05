const WRITE_CONCURRENCY = parseInt(process.env.WRITE_CONCURRENCY, 10) || 10

const { batchedUpdate } = require('./helpers/batchedUpdate')
const { promiseMapWithLimit } = require('../app/src/util/promises')
const { db } = require('../app/src/infrastructure/mongodb')
const DocstoreManager = require('../app/src/Features/Docstore/DocstoreManager')

async function main() {
  await batchedUpdate(
    'docs',
    {
      $or: [
        { 'ranges.comments.metadata.user_id': 'anonymous-user' },
        { 'ranges.updates.metadata.user_id': 'anonymous-user' },
      ],
    },
    processBatch,
    { _id: 1, project_id: 1 }
  )
}

main()
  .then(() => {
    process.exit(0)
  })
  .catch(error => {
    console.error({ error })
    process.exit(1)
  })

async function processBatch(_, docs) {
  await promiseMapWithLimit(WRITE_CONCURRENCY, docs, processDoc)
}

async function processDoc(lightDoc) {
  const { _id: docId, project_id: projectId } = lightDoc
  while (true) {
    const doc = await db.docs.findOne(
      { _id: docId },
      { projection: { ranges: 1, rev: 1 } }
    )
    if (!doc) {
      console.error('project has been hard deleted:', projectId.toString())
      break
    }

    const ranges = DocstoreManager.normalizeRanges(doc.ranges)

    const res = await db.docs.updateOne(
      { _id: docId, rev: doc.rev },
      { $set: { ranges }, $inc: { rev: 1 } }
    )
    if (res.modifiedCount === 1) {
      break
    }
    console.log('doc not stable, retrying', docId.toString())
  }
}
