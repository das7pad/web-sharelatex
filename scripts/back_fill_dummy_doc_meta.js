const { promisify } = require('util')
const { ObjectId, ReadPreference } = require('mongodb')
const { db, waitForDb } = require('../app/src/infrastructure/mongodb')
const sleep = promisify(setTimeout)

const NOW_IN_S = Date.now() / 1000
const ONE_WEEK_IN_S = 1000 * 60 * 60 * 24 * 7
const TEN_SECONDS = 10 * 1000

const DRY_RUN = process.env.DRY_RUN === 'true'
if (!process.env.FIRST_PROJECT_ID) {
  console.error('Set FIRST_PROJECT_ID and re-run.')
  process.exit(1)
}
const FIRST_PROJECT_ID = ObjectId(process.env.FIRST_PROJECT_ID)
const INCREMENT_BY_S = parseInt(process.env.INCREMENT_BY_S, 10) || ONE_WEEK_IN_S
const STOP_AT_S = parseInt(process.env.STOP_AT_S, 10) || NOW_IN_S
const LET_USER_DOUBLE_CHECK_INPUTS_FOR =
  parseInt(process.env.LET_USER_DOUBLE_CHECK_INPUTS_FOR, 10) || TEN_SECONDS

const DUMMY_NAME = 'unknown.tex'
const DUMMY_TIME = new Date('2021-04-12T00:00:00.000Z')

function getSecondsFromObjectId(id) {
  return id.getTimestamp().getTime() / 1000
}

async function main() {
  await letUserDoubleCheckInputs()
  await waitForDb()

  let start = getSecondsFromObjectId(FIRST_PROJECT_ID)
  // include the FIRST_PROJECT_ID in the first batch
  start -= 1

  let nProcessed = 0
  while (start < STOP_AT_S) {
    const end = start + INCREMENT_BY_S
    const startId = ObjectId.createFromTime(start)
    const endId = ObjectId.createFromTime(end)
    const query = {
      project_id: {
        // do not include edge
        $gt: startId,
        // include edge
        $lte: endId
      },
      deleted: true,
      name: {
        $exists: false
      }
    }
    const docs = await db.docs
      .find(query, { readPreference: ReadPreference.SECONDARY })
      .project({ _id: 1, project_id: 1 })
      .toArray()

    if (docs.length) {
      const docIds = docs.map(doc => doc._id)
      console.log('Back filling dummy meta data for', JSON.stringify(docIds))
      await processBatch(docs)
      nProcessed += docIds.length
    }
    console.error('Processed %d until %s', nProcessed, endId)

    start = end
  }
}

async function processBatch(docs) {
  for (const doc of docs) {
    const { _id: docId, project_id: projectId } = doc
    const deletedProject = await db.deletedProjects.findOne(
      { 'deleterData.deletedProjectId': projectId },
      {
        projection: {
          _id: 1,
          'project.deletedDocs': 1
        }
      }
    )
    let name = DUMMY_NAME
    let deletedAt = DUMMY_TIME
    if (deletedProject) {
      const project = deletedProject.project
      if (project) {
        const deletedDoc =
          project.deletedDocs &&
          project.deletedDocs.find(deletedDoc => docId.equals(deletedDoc._id))
        if (deletedDoc) {
          console.log('Found deletedDoc for %s', docId)
          name = deletedDoc.name
          deletedAt = deletedDoc.deletedAt
        } else {
          console.log('Missing deletedDoc for %s', docId)
        }
      } else {
        console.log('Orphaned deleted doc %s (failed hard deletion)', docId)
      }
    } else {
      console.log('Orphaned deleted doc %s (no deletedProjects entry)', docId)
    }
    if (DRY_RUN) return
    await db.docs.updateOne({ _id: docId }, { $set: { name, deletedAt } })
  }
}

async function letUserDoubleCheckInputs() {
  console.error(
    'Options:',
    JSON.stringify(
      {
        DRY_RUN,
        FIRST_PROJECT_ID,
        INCREMENT_BY_S,
        STOP_AT_S,
        LET_USER_DOUBLE_CHECK_INPUTS_FOR
      },
      null,
      2
    )
  )
  console.error(
    'Waiting for you to double check inputs for',
    LET_USER_DOUBLE_CHECK_INPUTS_FOR,
    'ms'
  )
  await sleep(LET_USER_DOUBLE_CHECK_INPUTS_FOR)
}

main()
  .then(() => {
    console.error('Done.')
    process.exit(0)
  })
  .catch(error => {
    console.error({ error })
    process.exit(1)
  })
