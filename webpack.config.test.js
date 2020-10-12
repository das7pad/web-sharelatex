const base = require('./webpack.config')

const OUTPUT_PATH = '/tmp/test_karma_dist'

module.exports = Object.assign({}, base, {
  mode: 'development',

  // only compile the tests bundle
  entry: { import_tests: './test/karma/import_tests.js' },

  // overwrite the 'public/' path
  output: { path: OUTPUT_PATH },

  // disable code splitting
  optimization: {},

  // omit plugins that would write useless things to public/
  //  - WebpackAssetsManifest: we do not read the manifest.json
  //  - CopyPlugin: the tests do not load the static assets from public/vendor/
  plugins: base.plugins.filter(
    plugin =>
      !['WebpackAssetsManifest', 'CopyPlugin'].includes(plugin.constructor.name)
  )
})
