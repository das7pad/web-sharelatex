const { EventEmitter } = require('events')

const bus = new EventEmitter()
const serverEpoch = Date.now()

async function handleEventSourceRequest(request, response) {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream'
  })
  response.flushHeaders()

  // Let client know about potential server restart.
  writeSSE(response, 'epoch', serverEpoch)

  function listener(blob) {
    writeSSE(response, 'rebuild', blob)
  }
  bus.on('rebuild', listener)
  request.on('aborted', () => {
    bus.off('rebuild', listener)
  })
}

function writeSSE(response, event, data) {
  response.write(`event: ${event}\n`)
  response.write(`data: ${data}\n`)
  response.write('\n\n')
}

function notifyFrontendAboutRebuild(name, error, result) {
  const warnings = result && result.warnings
  const blob = JSON.stringify({
    name,
    error,
    warnings
  })
  bus.emit('rebuild', blob)
}

module.exports = {
  handleEventSourceRequest,
  notifyFrontendAboutRebuild
}
