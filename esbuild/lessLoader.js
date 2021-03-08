/**
 vendor of esbuild-plugin-less
 @url https://github.com/iam-medvedev/esbuild-plugin-less/blob/d8f5669467238d71bd9e068ac4f9d5d4fcc71cd4/src/index.ts
 @license WTFPL License
 @copyright 2021 Ilya Medvedev <ilya@medvedev.im>
 */

const path = require('path')
const { promises: fs } = require('fs')
const less = require('less')

const namespace = 'less'

/** Less-loader for esbuild */
module.exports = function lessLoader(options = {}) {
  return {
    name: 'less-loader',
    setup: build => {
      // Resolve *.less files with namespace
      build.onResolve({ filter: /\.less$/ }, args => {
        return {
          path: path.resolve(
            process.cwd(),
            path.relative(process.cwd(), args.resolveDir),
            args.path
          ),
          namespace
        }
      })

      // Build .less files
      build.onLoad({ filter: /.*/, namespace }, async args => {
        const content = await fs.readFile(args.path, 'utf-8')
        const dir = path.dirname(args.path)

        const lessOpts = {
          // CHANGED: filename must be the full path -- see lessc
          filename: args.path,

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

        const result = await less.render(content, lessOpts)

        return {
          contents: result.css,
          loader: 'css',
          resolveDir: dir
        }
      })
    }
  }
}
