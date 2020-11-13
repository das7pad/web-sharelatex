const { assertHasStatusCode } = require('../support/requestHelper')

const ANGULAR_PROJECT_CONTROLLER_REGEX = /controller="ProjectPageController"/
const TITLE_REGEX = /<title>Your Projects - .*, Online LaTeX Editor<\/title>/

async function loadProjectDashboard({ request }) {
  const response = await request('/project')
  assertHasStatusCode(response, 200)
  if (!TITLE_REGEX.test(response.body)) {
    throw new Error('body does not have correct title')
  }
  if (!ANGULAR_PROJECT_CONTROLLER_REGEX.test(response.body)) {
    throw new Error('body does not have correct angular controller')
  }
}

module.exports = { loadProjectDashboard }
