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
new EventSource(import.meta.url + '/event-source').addEventListener(
  'rebuild',
  ({ data: blob }) => {
    const { name, error, warnings } = JSON.parse(blob)
    if (error) {
      console.group('esbuild rebuild failed:', name)
      for (const message of error.errors) {
        formatMessage('error', message)
      }
      for (const message of error.warnings) {
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
)
