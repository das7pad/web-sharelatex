/**
 based on esbuild-plugin-less
 @url https://github.com/iam-medvedev/esbuild-plugin-less/blob/d8f5669467238d71bd9e068ac4f9d5d4fcc71cd4/src/index.ts
 @license WTFPL License
 @copyright 2021 Ilya Medvedev <ilya@medvedev.im>
 */

const { execFile } = require('child_process')
const { promisify } = require('util')

/** Less-loader for esbuild */
module.exports = function lessLoader(options = {}) {
  return {
    name: 'less-loader',
    setup: build => {
      // Build .less files
      build.onLoad({ filter: /\.less$/ }, async args => {
        return await renderLessInSubprocess(args.path, options)
      })
    }
  }
}

/** Convert less error into esbuild error
 *  https://github.com/iam-medvedev/esbuild-plugin-less/pull/12
 * */
function convertLessError(error) {
  const sourceLine = error.extract.filter(line => line)
  const lineText = sourceLine.length === 3 ? sourceLine[1] : sourceLine[0]

  return {
    text: error.message,
    location: {
      namespace: 'file',
      file: error.filename,
      line: error.line,
      column: error.column,
      lineText
    }
  }
}

async function main() {
  const fs = require('fs')
  const Path = require('path')
  const less = require('less')
  const options = JSON.parse(process.argv.pop())
  const entrypointPath = process.argv.pop()
  let out
  const dir = Path.dirname(entrypointPath)
  const blob = await fs.promises.readFile(entrypointPath, 'utf-8')
  try {
    const lessOpts = {
      // CHANGED: filename must be the full path -- see lessc
      filename: entrypointPath,

      // CHANGED: Importing relative files works!
      rootpath: './',
      rewriteUrls: 'all',

      ...options,

      // CHANGED: align with lessc and put the dir first.
      paths: [dir, ...(options.paths || [])]

      // NOTE: Source map support for css is not there yet in esbuild.
      // REF: https://github.com/evanw/esbuild/issues/519
      // sourceMap: { sourceMapFileInline: true }
    }

    const result = await less.render(blob, lessOpts)
    const { css: bundleContents, imports: watchFiles } = result

    // Back fill entrypoint, it is not part of the `imports` list
    watchFiles.push(entrypointPath)

    out = {
      contents: bundleContents,
      loader: 'css',
      resolveDir: dir,
      warnings: [],
      watchFiles
    }
  } catch (error) {
    const message = convertLessError(error)
    out = {
      errors: [message],
      resolveDir: dir,
      warnings: [],
      // CHANGED: add support for watch mode
      watchFiles: [message.location.file]
    }
  }
  console.log(JSON.stringify(out))
}

async function renderLessInSubprocess(path, options) {
  const blob = `
   ${main.toString()}
   ${convertLessError.toString()}
   main()
  `
  const { stderr: stdErr, stdout: stdOut } = await promisify(
    execFile
  )(process.execPath, [
    '--unhandled-rejections=strict',
    '-e',
    blob,
    path,
    JSON.stringify(options)
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
