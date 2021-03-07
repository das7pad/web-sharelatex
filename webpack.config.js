const path = require('path')
const CopyPlugin = require('copy-webpack-plugin')
const WebpackAssetsManifest = require('webpack-assets-manifest')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const AutoPrefixer = require('autoprefixer')

const VENDOR_PATH = path.join(__dirname, 'public', 'vendor')

// Generate a hash of entry points, including modules
const entryPoints = {
  style: './frontend/stylesheets/style.less',
  'light-style': './frontend/stylesheets/light-style.less'
}

module.exports = {
  // Defines the "entry point(s)" for the application - i.e. the file which
  // bootstraps the application
  entry: entryPoints,

  // Define where and how the bundle will be output to disk
  // Note: webpack-dev-server does not write the bundle to disk, instead it is
  // kept in memory for speed
  output: {
    publicPath: '/',

    path: path.join(__dirname, '/public'),

    // By default write into js directory
    filename: 'js/[name].js'
  },

  // Define how file types are handled by webpack
  module: {
    rules: [
      {
        // preserve assets that are already in the output directory
        test: new RegExp(`^${path.join(__dirname, 'public')}`),
        loader: 'file-loader',
        options: {
          // use the file inplace
          context: 'public',
          name: '[path][name].[ext]',
          emitFile: false
        }
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: MiniCssExtractPlugin.loader,
            options: {
              // filename is set to `stylesheets/[name]-[hash].css` downstream
              publicPath: '../'
            }
          },
          {
            loader: 'css-loader'
          },
          {
            loader: 'postcss-loader',
            options: {
              plugins: [AutoPrefixer]
            }
          },
          {
            loader: 'less-loader'
          }
        ]
      },
      {
        // Load fonts
        test: /\.(woff|woff2)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              // Output to public/font, relative to stylesheets/style.css
              publicPath: '../',
              name: 'fonts/[name].[ext]'
            }
          }
        ]
      }
    ]
  },

  plugins: [
    // Generate a manifest.json file which is used by the backend to map the
    // base filenames to the generated output filenames
    new WebpackAssetsManifest({
      publicPath: true,
      entrypoints: true,
      customize(entry) {
        if (/^fonts/.test(entry.key)) {
          // omit fonts, they are loaded via css only
          return false
        }
        if (/cmaps/.test(entry.value)) {
          // omit the vendored cmaps
          return false
        }
        if (/ace-builds/.test(entry.value)) {
          // omit minified ace source, they are loaded via ace internals
          return false
        }
        if (/sigma-master/.test(entry.value)) {
          // loaded via staticPath
          return false
        }
        if (/vendor\/mathjax/.test(entry.value)) {
          // booted via MathJaxBundle and then loaded via staticPath
          return false
        }
        return entry
      }
    }),

    new CopyPlugin(
      [
        // pdfjs worker
        'pdfjs-dist/build/pdf.worker.min.js',
        // Copy CMap files from pdfjs-dist package to build output. These are used
        // to provide support for non-Latin characters
        'pdfjs-dist/cmaps',
        // optional package ace files - minified: keymaps, modes, themes, worker
        'ace-builds/src-min-noconflict'
      ]
        .map(path => {
          return { from: `node_modules/${path}`, to: `${VENDOR_PATH}/${path}` }
        })
        .concat(
          // Copy the required files for loading MathJax from MathJax NPM package
          [
            'MathJax.js',
            'config/**/*',
            'extensions/**/*',
            'localization/en/**/*',
            'jax/output/HTML-CSS/fonts/TeX/**/*',
            'jax/output/HTML-CSS/**/*.js',
            'jax/element/**/*',
            'jax/input/**/*',
            'fonts/HTML-CSS/TeX/woff/*'
          ].map(from => {
            return {
              context: 'node_modules/mathjax',
              from,
              to: `${VENDOR_PATH}/mathjax`
            }
          })
        )
        .concat(
          ['sigma-master'].map(path => {
            return {
              from: `frontend/js/vendor/libs/${path}`,
              to: `${VENDOR_PATH}/${path}`
            }
          })
        )
        .concat(
          [
            // open-in-overleaf
            'highlight-github.css'
          ].map(path => {
            return {
              from: `frontend/stylesheets/vendor/${path}`,
              to: `${VENDOR_PATH}/stylesheets/${path}`
            }
          })
        )
    )
  ],

  stats: {
    excludeAssets: /^vendor\//
  }
}
