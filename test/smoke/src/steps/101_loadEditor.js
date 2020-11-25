const Settings = require('settings-sharelatex')

const PROJECT_ID_REGEX = new RegExp(
  `<meta id="ol-project_id" content="${Settings.smokeTest.projectId}">`
)

async function run({ assertHasStatusCode, request }) {
  const response = await request(`/project/${Settings.smokeTest.projectId}`)

  assertHasStatusCode(response, 200)

  if (!PROJECT_ID_REGEX.test(response.body)) {
    throw new Error('project page html does not have project_id')
  }
}

module.exports = { run }
