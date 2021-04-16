/**
 vendor of esbuild-plugin-less
 @url https://github.com/iam-medvedev/esbuild-plugin-less/blob/d8f5669467238d71bd9e068ac4f9d5d4fcc71cd4/src/index.ts
 @license WTFPL License
 @copyright 2021 Ilya Medvedev <ilya@medvedev.im>
 */

const path = require('path')
const { promises: fs } = require('fs')
const less = require('less')

/** Less-loader for esbuild */
module.exports = function lessLoader(options = {}) {
  return {
    name: 'less-loader',
    setup: build => {
      // Build .less files
      build.onLoad({ filter: /\.less$/ }, async args => {
        const entrypointPath = args.path
        const entrypointSrc = await fs.readFile(entrypointPath, 'utf-8')
        const dir = path.dirname(entrypointPath)

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

        let result
        try {
          result = await less.render(entrypointSrc, lessOpts)
        } catch (error) {
          const message = convertLessError(error)
          return {
            errors: [message],
            resolveDir: dir,
            // CHANGED: add support for watch mode
            watchFiles: [message.location.file]
          }
        }

        // CHANGED: add support for watch mode
        const { css: bundleContents, imports: watchFiles } = result

        // Back fill entrypoint, it is not part of the `imports` list
        watchFiles.push(entrypointPath)

        return {
          contents: bundleContents,
          loader: 'css',
          resolveDir: dir,
          watchFiles
        }
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
