const { exec } = require('child_process')
const { promisify } = require('util')
const { expect } = require('chai')
const logger = require('logger-sharelatex')
const {
  skipWithBrokenObjectIdCounter,
} = require('./helpers/skipWithBrokenObjectIdCounter')
const { db, ObjectId } = require('../../../app/src/infrastructure/mongodb')
const User = require('./helpers/User').promises

async function setRanges(docId, ranges) {
  await db.docs.updateOne(
    { _id: docId },
    { $set: { ranges, rev: 42 } },
    { upsert: true }
  )
}

describe('BackFillDocsRangesValidUserId', function () {
  skipWithBrokenObjectIdCounter()

  let user, projectId1, projectId2, docId1, docId2, docId3
  beforeEach('create projects', async function () {
    user = new User()
    await user.login()

    projectId1 = ObjectId(await user.createProject('project1'))
    projectId2 = ObjectId(await user.createProject('project2'))
  })
  beforeEach('create docs', async function () {
    docId1 = ObjectId(
      await user.createDocInProject(projectId1, null, 'doc1.tex')
    )
    docId2 = ObjectId(
      await user.createDocInProject(projectId1, null, 'doc2.tex')
    )
    docId3 = ObjectId(
      await user.createDocInProject(projectId2, null, 'doc3.tex')
    )
  })
  beforeEach('set ranges details', async function () {
    const ranges1 = { comments: [] }
    const ranges2 = {
      comments: [{ metadata: { user_id: 'anonymous-user' } }],
      changes: [{ metadata: { user_id: 'anonymous-user' } }],
    }
    const ranges3 = {
      comments: [{ metadata: { user_id: 'anonymous-user' } }],
      changes: [
        { metadata: { user_id: 'anonymous-user' } },
        { metadata: { user_id: ObjectId(user.id) } },
      ],
    }
    await setRanges(docId1, ranges1)
    await setRanges(docId2, ranges2)
    await setRanges(docId3, ranges3)
  })

  async function runScript() {
    let result
    try {
      result = await promisify(exec)(
        ['node', 'scripts/back_fill_docs_ranges_valid_user_id'].join(' ')
      )
    } catch (error) {
      // dump details like exit code, stdErr and stdOut
      logger.error({ error }, 'script failed')
      throw error
    }
    const { stderr: stdErr, stdout: stdOut } = result
    expect(stdOut).to.not.include(docId1.toString())
    expect(stdOut).to.include(docId2.toString())
    expect(stdOut).to.include(docId3.toString())

    expect(stdErr).to.include(`Completed batch ending ${docId3}`)
  }

  beforeEach('run script', async function () {
    await runScript()
  })

  it('should back fill valid user ids where needed', async function () {
    const docs = await db.docs.find({}).toArray()
    expect(docs).to.deep.equal([
      {
        _id: docId1,
        ranges: {
          comments: [],
        },
        rev: 42,
      },
      {
        _id: docId2,
        ranges: {
          comments: [
            { metadata: { user_id: ObjectId('000000000000000000000000') } },
          ],
          changes: [
            { metadata: { user_id: ObjectId('000000000000000000000000') } },
          ],
        },
        rev: 43,
      },
      {
        _id: docId3,
        ranges: {
          comments: [
            { metadata: { user_id: ObjectId('000000000000000000000000') } },
          ],
          changes: [
            { metadata: { user_id: ObjectId('000000000000000000000000') } },
            { metadata: { user_id: ObjectId(user.id) } },
          ],
        },
        rev: 43,
      },
    ])
  })
})
