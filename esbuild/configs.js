const Path = require('path')
const glob = require('glob')
const BROWSER_TARGETS = require('./getBrowserTargets')
const lessLoader = require('./plugins/lessLoader')
const valLoader = require('./plugins/valLoader')

const ROOT = Path.dirname(__dirname)
const FRONTEND_PATH = Path.join(ROOT, 'frontend')
const GENERATED_PATH = Path.join(ROOT, 'generated')
const MODULES_PATH = Path.join(ROOT, 'modules')
const PUBLIC_PATH = Path.join(ROOT, 'public')

const COMMON_CFG = {
  assetNames: 'assets/[name]-[hash]',
  bundle: true,
  chunkNames: 'chunks/[name]-[hash]',
  entryNames: '[dir]/[name]-[hash]',
  inject: [],
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
    '.gif': 'file',
  },
}

const CONFIGS = [
  {
    DESCRIPTION: 'main bundles',

    metafile: true,
    splitting: true,
    format: 'esm',
    entryPoints: [
      Path.join(FRONTEND_PATH, 'js/ide.js'),
      Path.join(FRONTEND_PATH, 'js/main.js'),
      ...glob.sync(Path.join(FRONTEND_PATH, 'js/pages/**/*.js')),
    ],
    outbase: Path.join(FRONTEND_PATH, 'js'),
    outdir: Path.join(PUBLIC_PATH, 'js'),
    inject: [Path.join(ROOT, 'esbuild/inject/bootstrap.js')],
    define: {
      'process.env.NODE_ENV': '"production"',
      // work around 'process' usage in algoliasearch
      'process.env.RESET_APP_DATA_TIMER': 'null',
      // silence ad
      __REACT_DEVTOOLS_GLOBAL_HOOK__: '{ "isDisabled": true }',
    },
    plugins: [valLoader(Path.join(MODULES_PATH, 'modules-.*.js'))],
    loader: { '.js': 'jsx' },
    tsconfig: Path.join(ROOT, 'esbuild/tsconfig.json'),
  },

  {
    DESCRIPTION: 'MathJax in non-strict mode',

    metafile: true,
    entryPoints: [Path.join(FRONTEND_PATH, 'js/MathJaxBundle.js')],
    outbase: Path.join(FRONTEND_PATH, 'js'),
    outdir: Path.join(PUBLIC_PATH, 'js'),
  },

  {
    DESCRIPTION: 'translations bundles',

    metafile: true,
    entryPoints: require('glob').sync(Path.join(GENERATED_PATH, 'lng/*.js')),
    outbase: Path.join(GENERATED_PATH, 'lng'),
    outdir: Path.join(PUBLIC_PATH, 'js/t'),
  },

  {
    DESCRIPTION: 'stylesheets',

    metafile: true,
    plugins: [
      lessLoader({
        // Resolve all the math expressions
        math: 'always',
      }),
    ],
    entryPoints: [
      Path.join(FRONTEND_PATH, 'stylesheets/style.less'),
      Path.join(FRONTEND_PATH, 'stylesheets/light-style.less'),
    ],
    outbase: Path.join(FRONTEND_PATH, 'stylesheets'),
    outdir: Path.join(PUBLIC_PATH, 'stylesheets'),
  },
]

function inflateConfig(cfg) {
  return Object.assign({}, COMMON_CFG, cfg)
}

const MAIN_BUNDLES_CONFIG = CONFIGS[0]

module.exports = {
  CONFIGS,
  MAIN_BUNDLES_CONFIG,
  inflateConfig,
}
