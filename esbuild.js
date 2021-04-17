const { buildAllConfigs } = require('./esbuild/build')
const { logWithTimestamp } = require('./esbuild/utils')

if (require.main === module) {
  const ACTION = process.argv.pop()

  if (ACTION === 'build') {
    buildAllConfigs({ isWatchMode: false })
      .then(timings => {
        console.table(timings)
        console.error('esbuild build succeeded.')
        process.exit(0)
      })
      .catch(error => {
        console.error('esbuild build failed:', error)
        process.exit(1)
      })
  } else if (ACTION === 'watch') {
    buildAllConfigs({ isWatchMode: true })
      .then(() => {
        logWithTimestamp('esbuild is ready in watch mode.')
      })
      .catch(error => {
        console.error('esbuild initial build in watch mode failed:', error)
        process.exit(1)
      })
  } else {
    console.error(`unknown action: ${JSON.stringify(ACTION)}`)
    process.exit(101)
  }
}
