const Path = require('path')
const esbuild = require('esbuild')
const BROWSER_TARGETS = require('./esbuild/getBrowserTargets')
const aliasResolver = require('./esbuild/aliasResolver')
const lessLoader = require('./esbuild/lessLoader')
const valLoader = require('./esbuild/valLoader')
const writeManifest = require('./esbuild/writeManifest')

const FRONTEND_PATH = Path.join(__dirname, 'frontend')
const GENERATED_PATH = Path.join(__dirname, 'generated')
const NODE_MODULES = Path.join(__dirname, 'node_modules')
const PUBLIC_PATH = Path.join(__dirname, 'public')

const COMMON_CFG = {
  assetNames: 'assets/[name]-[hash]',
  bundle: true,
  chunkNames: 'chunks/[name]-[hash]',
  entryNames: '[dir]/[name]-[hash]',
  minifyWhitespace: true,
  minifySyntax: true,
  sourcemap: true,
  target: BROWSER_TARGETS,
  outdir: PUBLIC_PATH,
  loader: {
    '.woff': 'file',
    '.woff2': 'file',
    '.png': 'file',
    '.svg': 'file',
    '.gif': 'file'
  }
}

const CONFIGS = [
  // main bundles
  {
    metafile: true,
    splitting: true,
    format: 'esm',
    entryPoints: [
      Path.join(FRONTEND_PATH, 'js/ide.js'),
      Path.join(FRONTEND_PATH, 'js/main.js')
    ],
    outbase: Path.join(FRONTEND_PATH, 'js'),
    outdir: Path.join(PUBLIC_PATH, 'js'),
    inject: [Path.join(__dirname, 'esbuild/bootstrap.js')],
    define: {
      'process.env.NODE_ENV': '"production"',
      // work around 'process' usage in algoliasearch
      'process.env.RESET_APP_DATA_TIMER': 'null',
      // silence ad
      __REACT_DEVTOOLS_GLOBAL_HOOK__: '{ "isDisabled": true }'
    },
    plugins: [
      aliasResolver({
        libs: Path.join(FRONTEND_PATH, 'js/vendor/libs'),
        ace: Path.join(NODE_MODULES, 'ace-builds/src-noconflict')
      }),
      valLoader(Path.join(__dirname, 'modules/modules-ide.js')),
      valLoader(Path.join(__dirname, 'modules/modules-main.js'))
    ],
    loader: { '.js': 'jsx' }
  },

  // mathjax in non-strict
  {
    metafile: true,
    entryPoints: [Path.join(FRONTEND_PATH, 'js/MathJaxBundle.js')],
    outbase: Path.join(FRONTEND_PATH, 'js'),
    outdir: Path.join(PUBLIC_PATH, 'js')
  },

  // translations bundles
  {
    metafile: true,
    entryPoints: require('glob').sync(Path.join(GENERATED_PATH, 'lng/*.js')),
    outbase: Path.join(GENERATED_PATH, 'lng'),
    outdir: Path.join(PUBLIC_PATH, 'js/t')
  },

  // stylesheets
  {
    metafile: true,
    plugins: [
      lessLoader({
        // resolve all the math expressions
        math: 'always'
      })
    ],
    entryPoints: [
      Path.join(FRONTEND_PATH, 'stylesheets/style.less'),
      Path.join(FRONTEND_PATH, 'stylesheets/light-style.less')
    ],
    outbase: Path.join(FRONTEND_PATH, 'stylesheets'),
    outdir: Path.join(PUBLIC_PATH, 'stylesheets')
  }
].map(cfg => Object.assign({}, COMMON_CFG, cfg))

const ACTION = process.argv.pop()
if (ACTION === 'watch') {
  CONFIGS.forEach(cfg => {
    Object.assign(cfg, {
      watch: {
        onRebuild(error, result) {
          if (error) {
            console.error('watch build failed:', error)
          } else {
            console.error('watch build succeeded:', result)
            writeManifest(result.metafile, PUBLIC_PATH).catch(() => {})
          }
        }
      }
    })
  })
}

if (ACTION === 'build' || ACTION === 'watch') {
  Promise.all(CONFIGS.map(esbuild.build))
    .then(async results => {
      for (const result of results) {
        await writeManifest(result.metafile, PUBLIC_PATH)
      }
    })
    .catch(() => process.exit(1))
}

async function buildTestBundle(entrypoint, platform, target) {
  const OUTPUT_PATH = Path.join('/tmp', 'web', 'testBundle', platform)
  const { define, inject, plugins, loader } = CONFIGS[0]
  const cfg = {
    entryNames: '[dir]/[name]',
    entryPoints: [entrypoint],
    plugins: [
      valLoader(Path.join(__dirname, 'test/frontend/allTests.js')),
      valLoader(Path.join(__dirname, 'test/karma/allTests.js')),
      ...plugins
    ],
    outdir: OUTPUT_PATH,
    platform,
    target,
    define,
    inject,
    loader
  }

  try {
    await esbuild.build(Object.assign({}, COMMON_CFG, cfg))
  } catch (error) {
    console.error('esbuild error:', error)
    throw new Error(`esbuild failed: ${error.message}`)
  }
  return Path.join(OUTPUT_PATH, Path.basename(entrypoint))
}

async function buildTestBundleForBrowser(entrypoint) {
  return buildTestBundle(entrypoint, 'browser', BROWSER_TARGETS)
}

async function buildTestBundleForNode(entrypoint) {
  // process.version is v prefixed -- e.g. v14.16.0
  const nodeVersion = process.version.slice(1)
  return buildTestBundle(entrypoint, 'node', `node${nodeVersion}`)
}

module.exports = {
  buildTestBundleForBrowser,
  buildTestBundleForNode
}
