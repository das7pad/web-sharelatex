const OError = require('@overleaf/o-error')

class SmokeTestFailure extends OError {
  constructor(message, stats, cause) {
    super(message, { stats }, cause)
  }
}

const Failure = SmokeTestFailure

module.exports = {
  Failure,
  SmokeTestFailure
}
