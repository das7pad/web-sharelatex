const Path = require('path')
const esbuild = require('esbuild')
const TARGETS = require('./esbuild/getTargets')
const aliasResolver = require('./esbuild/aliasResolver')
// const lessLoader = require('./esbuild/lessLoader')
const valLoader = require('./esbuild/valLoader')

const FRONTEND_PATH = Path.join(__dirname, 'frontend')
const GENERATED_PATH = Path.join(__dirname, './generated')
const NODE_MODULES = Path.join(__dirname, 'node_modules')
const PUBLIC_PATH = Path.join(__dirname, 'public/esbuild')

const COMMON_CFG = {
  bundle: true,
  minifyWhitespace: true,
  minifySyntax: true,
  sourcemap: true,
  target: TARGETS,
  outdir: PUBLIC_PATH,
  external: [Path.join(PUBLIC_PATH, '/*')],
  loader: {
    '.woff': 'file',
    '.woff2': 'file',
    '.png': 'file',
    '.svg': 'file',
    '.gif': 'file'
    // inline loader images
    // 'overleaf-o.svg': 'dataurl',
    // 'overleaf-o-grey.svg': 'dataurl',
  }
}

const CONFIGS = [
  // main bundles
  {
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

  // translations bundles
  {
    entryPoints: require('glob').sync(Path.join(GENERATED_PATH, 'lng/*.js')),
    outbase: Path.join(GENERATED_PATH, 'lng'),
    outdir: Path.join(PUBLIC_PATH, 'js/t')
  }

  // stylesheets
  // {
  //   plugins: [lessLoader()],
  //   entryPoints: [
  //     Path.join(FRONTEND_PATH, 'stylesheets/style.less'),
  //     Path.join(FRONTEND_PATH, 'stylesheets/light-style.less')
  //   ],
  //   outbase: Path.join(FRONTEND_PATH, 'stylesheets'),
  //   outdir: Path.join(PUBLIC_PATH, 'stylesheets')
  // }
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
          }
        }
      }
    })
  })
}

if (ACTION === 'build' || ACTION === 'watch') {
  Promise.all(CONFIGS.map(esbuild.build)).catch(() => process.exit(1))
}
