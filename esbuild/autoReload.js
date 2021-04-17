const { EventEmitter } = require('events')

const bus = new EventEmitter()

async function handleEventSourceRequest(request, response) {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream'
  })
  response.flushHeaders()

  function listener(blob) {
    response.write('event: rebuild\n')
    response.write(`data: ${blob}\n`)
    response.write('\n\n')
  }
  bus.on('rebuild', listener)
  request.on('aborted', () => {
    bus.off('rebuild', listener)
  })
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
