const OError = require('@overleaf/o-error')

async function processWithTimeout({ work, timeout, message }) {
  let workDeadLine
  function checkInResults() {
    clearTimeout(workDeadLine)
  }
  await Promise.race([
    new Promise((resolve, reject) => {
      workDeadLine = setTimeout(() => {
        reject(new OError(message))
      }, timeout)
    }),
    work.finally(checkInResults)
  ])
}

module.exports = {
  processWithTimeout
}
