function formatMessage(prefix, message) {
  console.group(prefix, message.text)
  const { location } = message
  console.log('> %s:%d:%d', location.file, location.line, location.column)
  console.log('   %s | %s', location.line, location.lineText)
  const marker = location.length === 0 ? '^' : '~'.repeat(location.length)
  console.log(
    '   %s ╵ %s%s',
    ' '.repeat(location.line.toString().length),
    ' '.repeat(location.column),
    marker
  )
  console.groupEnd()
}

const clientEpoch = Date.now()

function onEpoch({ data }) {
  const serverEpoch = parseInt(data, 10)
  if (clientEpoch < serverEpoch) {
    window.location.reload()
  }
}

function onRebuild({ data }) {
  const { name, error, warnings } = JSON.parse(data)

  if (error) {
    console.group('esbuild rebuild failed:', name)
    for (const message of error.errors || []) {
      formatMessage('error', message)
    }
    for (const message of error.warnings || []) {
      formatMessage('warning', message)
    }
    console.groupEnd()
  } else {
    if (warnings.length) {
      console.group('esbuild rebuild produced warnings:', name)
      for (const message of warnings) {
        formatMessage('warning', message)
      }
      console.groupEnd()
    }
    window.location.reload()
  }
}

function openNewBus() {
  const bus = new EventSource(import.meta.url + '/event-source')
  bus.addEventListener('epoch', onEpoch)
  bus.addEventListener('rebuild', onRebuild)
  bus.addEventListener('error', () => {
    bus.close()
    setTimeout(openNewBus, 1000)
  })
}
openNewBus()

// Use a dummy export map for marking this file as ES6.
export {}
