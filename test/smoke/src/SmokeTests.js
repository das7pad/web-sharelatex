const fs = require('fs')
const Path = require('path')

const Settings = require('settings-sharelatex')
const { getCsrfTokenForFactory } = require('./support/Csrf')
const { SmokeTestFailure } = require('./support/Errors')
const {
  requestFactory,
  assertHasStatusCode
} = require('./support/requestHelper')
const { processWithTimeout } = require('./support/timeoutHelper')

const STEP_TIMEOUT = Settings.smokeTest.stepTimeout

const PATH_STEPS = Path.join(__dirname, './steps')
const STEPS = fs
  .readdirSync(PATH_STEPS)
  .sort()
  .map(name => {
    const step = require(Path.join(PATH_STEPS, name))
    step.name = Path.basename(name, '.js')
    return step
  })

async function runSmokeTests({ stats }) {
  let step
  let lastStep = stats.start
  function completeStep(key) {
    step = Date.now()
    stats.steps.push({ [key]: step - lastStep })
    lastStep = step
  }

  const request = requestFactory({ timeout: STEP_TIMEOUT })
  const getCsrfTokenFor = getCsrfTokenForFactory({ request })
  const ctx = {
    assertHasStatusCode,
    completeStep,
    getCsrfTokenFor,
    processWithTimeout,
    request,
    stats,
    timeout: STEP_TIMEOUT
  }
  const cleanupSteps = []

  async function runAndTrack(id, fn) {
    let result
    try {
      result = await fn(ctx)
    } catch (err) {
      throw new SmokeTestFailure(`${id} failed`, { stats }, err)
    } finally {
      completeStep(id)
    }
    Object.assign(ctx, result)
  }

  completeStep('init')

  let err
  try {
    for (step of STEPS) {
      const { name, run, cleanup } = step
      if (cleanup) cleanupSteps.unshift({ name, cleanup })

      await runAndTrack(`run.${name}`, run)
    }
  } catch (e) {
    err = e
  }

  const cleanupErrors = []
  for (const step of cleanupSteps) {
    const { name, cleanup } = step

    try {
      await runAndTrack(`cleanup.${name}`, cleanup)
    } catch (err) {
      // keep going with cleanup
      cleanupErrors.push(err)
    }
  }

  if (err) throw err
  if (cleanupErrors.length) {
    if (cleanupErrors.length === 1) throw cleanupErrors[0]
    throw new SmokeTestFailure('multiple cleanup steps failed', {
      stats,
      cleanupErrors
    })
  }
}

module.exports = { runSmokeTests, SmokeTestFailure }
