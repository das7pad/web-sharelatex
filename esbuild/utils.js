function logWithTimestamp(...args) {
  console.error(`[${new Date().toISOString()}]`, ...args)
}

function trackDurationInMS() {
  const t0 = process.hrtime()
  return function () {
    const [s, ns] = process.hrtime(t0)
    return (s * 1e9 + ns) / 1e6
  }
}

module.exports = {
  logWithTimestamp,
  trackDurationInMS,
}
