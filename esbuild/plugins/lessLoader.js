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
  // error.extract = [lineTextBeforeError, lineText, lineTextAfterError]
  // NOTE: lineTextBeforeError and lineTextAfterError may be null.
  const [, lineText] = error.extract

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
  const dir = Path.dirname(entrypointPath)
  const blob = await fs.promises.readFile(entrypointPath, 'utf-8')
  let out
  try {
    const lessOpts = {
      // Emit relative paths from here.
      filename: entrypointPath,

      // Resolve URL imports per file and emit relative paths from entrypoint.
      rewriteUrls: 'all',

      // Add custom options from the config.
      ...options,

      // Search imports in here.
      paths: [dir]

      // NOTE: Source map support for css is not there yet in esbuild.
      // REF: https://github.com/evanw/esbuild/issues/519
      // sourceMap: { sourceMapFileInline: true }
    }

    const result = await less.render(blob, lessOpts)
    const { css: bundleContents, imports } = result

    // Watch for changes in all the less files.
    const watchFiles = imports.concat([entrypointPath])

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
      // Wait for a fix in the file with errors.
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
