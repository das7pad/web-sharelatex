const Path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')

const NODE_EXEC_PATH = process.execPath
const RENDERER_PATH = Path.join(__dirname, 'lessRenderer.js')

module.exports = function lessLoader(options = {}) {
  return {
    name: 'less-loader',
    setup: build => {
      build.onLoad({ filter: /\.less$/ }, async args => {
        return await renderLessInSubprocess(args.path, options)
      })
    },
  }
}

async function renderLessInSubprocess(path, options) {
  const { stderr: stdErr, stdout: stdOut } = await promisify(
    execFile
  )(NODE_EXEC_PATH, [
    '--unhandled-rejections=strict',
    RENDERER_PATH,
    path,
    JSON.stringify(options),
  ])
  const result = JSON.parse(stdOut)
  if (stdErr) {
    const warnings = stdErr
      .split('\n')
      .filter(line => line.trim())
      .map(text => ({ text }))
    result.warnings.push(...warnings)
  }
  return result
}
