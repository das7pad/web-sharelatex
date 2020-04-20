const { User } = require('../app/src/models/User')
const UserController = require('../app/src/Features/User/UserController')
const pLimit = require('p-limit')
const CONCURRENCY = 10
const failure = []
const success = []
console.log('Starting ensure affiliations')

const query = {
  'emails.affiliationUnchecked': true
}

async function _handleEnsureAffiliation(user) {
  try {
    await UserController.promises.ensureAffiliation(user)
    console.log(`✔ ${user._id}`)
    success.push(user._id)
  } catch (error) {
    failure.push(user._id)
    console.log(`ERROR: ${user._id}`, error)
  }
}

async function getUsers() {
  return User.find(query, { emails: 1 }).exec()
}

async function run() {
  const limit = pLimit(CONCURRENCY)
  const users = await getUsers()
  console.log(`Found ${users.length} users`)
  await Promise.all(
    users.map((user) => limit(() => _handleEnsureAffiliation(user)))
  )

  console.log(`${success.length} successes`)
  console.log(`${failure.length} failures`)
  if (failure.length > 0) {
    console.log('Failed to update:', failure)
  }
}

run()
  .then(() => {
    process.exit()
  })
  .catch((error) => {
    console.log(error)
    process.exit(1)
  })
