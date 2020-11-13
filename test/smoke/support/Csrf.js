const { assertHasStatusCode } = require('./requestHelper')
const CSRF_REGEX = /<meta id="ol-csrfToken" content="(.+?)">/

function _parseCsrf(body) {
  const match = CSRF_REGEX.exec(body)
  if (!match) {
    throw new Error('Cannot find csrfToken in HTML.')
  }
  return match[1]
}

async function getCsrfTokenFor(endpoint, { request, completeStep, stats }) {
  try {
    const response = await request(endpoint)
    assertHasStatusCode(response, 200)
    return _parseCsrf(response.body)
  } catch (err) {
    throw new Failure(`error fetching csrf token on ${endpoint}`, stats, err)
  } finally {
    completeStep('getCsrfTokenFor' + endpoint)
  }
}

module.exports = {
  getCsrfTokenFor
}
