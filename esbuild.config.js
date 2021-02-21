const Path = require('path')
const esbuild = require('esbuild')
const TARGETS = require('./esbuild/getTargets')
const aliasResolver = require('./esbuild/aliasResolver')
const lessLoader = require('./esbuild/lessLoader')
const modulesLoader = require('./esbuild/modulesLoader')

const FRONTEND_PATH = Path.join(__dirname, 'frontend')
const GENERATED_PATH = Path.join(__dirname, './generated')
const PUBLIC_PATH = Path.join(__dirname, 'public')
const METAFILE_PATH = Path.join(PUBLIC_PATH, 'metafile.json')

const COMMON_CFG = {
  bundle: true,
  minify: true,
  sourcemap: true,
  target: TARGETS,
  outdir: PUBLIC_PATH,
  outbase: FRONTEND_PATH,
  define: {
    'process.env.NODE_ENV': '"production"',
    __REACT_DEVTOOLS_GLOBAL_HOOK__: '({ isDisabled: true })',
    regeneratorRuntime: 'window.regeneratorRuntime'
  },
  metafile: METAFILE_PATH,
  loader: {
    '.woff': 'file',
    '.woff2': 'file',
    '.png': 'file',
    '.svg': 'file'
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
    inject: [
      Path.join(__dirname, 'esbuild/angularExporter.js'),
      Path.join(__dirname, 'esbuild/jqueryExporter.js')
    ],
    plugins: [
      aliasResolver({
        libs: Path.join(FRONTEND_PATH, 'js/vendor/libs'),
        ace: 'ace-builds/src-noconflict'
      }),
      modulesLoader()
    ]
  },

  // translations bundles
  {
    entryPoints: require('glob').sync(Path.join(GENERATED_PATH, 'lng/*.js')),
    outbase: Path.join(GENERATED_PATH, 'lng'),
    outdir: Path.join(PUBLIC_PATH, 't')
  },

  // stylesheets
  {
    plugins: [lessLoader()],
    entryPoints: [
      Path.join(FRONTEND_PATH, 'stylesheets/style.less'),
      Path.join(FRONTEND_PATH, 'stylesheets/light-style.less')
    ]
  }
].map(cfg => Object.assign({}, COMMON_CFG, cfg))

const ACTION = process.argv.pop()
if (ACTION === 'build') {
  Promise.all(CONFIGS.map(esbuild.build)).catch(() => process.exit(1))
}
