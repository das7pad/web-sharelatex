const path = require('path')
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')
const WebpackAssetsManifest = require('webpack-assets-manifest')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const AutoPrefixer = require('autoprefixer')

const VENDOR_PATH = path.join(__dirname, 'public', 'vendor')

// Generate a hash of entry points, including modules
const entryPoints = {
  main: './frontend/js/main.js',
  ide: './frontend/js/ide.js',
  style: './frontend/stylesheets/style.less',
  'light-style': './frontend/stylesheets/light-style.less'
}

const TRANSLATIONS_FILES = require('glob').sync('./generated/lng/*.js')
TRANSLATIONS_FILES.forEach(file => {
  entryPoints[`t/${path.basename(file, '.js')}`] = file
})

// Attempt to load frontend entry-points from modules, if they exist
require('glob')
  .sync('./modules/*/frontend/js/index.js')
  .forEach(file => {
    const moduleName = file.split('/')[2]
    entryPoints[moduleName] = file
  })

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
        // Pass application JS files through babel-loader, compiling to ES5
        test: /\.js$/,
        // Only compile application files (npm and vendored dependencies are in
        // ES5 already)
        exclude: [
          /node_modules/,
          path.resolve(__dirname, 'frontend/js/vendor')
        ].concat(TRANSLATIONS_FILES.map(file => path.join(__dirname, file))),
        use: [
          {
            loader: 'babel-loader',
            options: {
              // Configure babel-loader to cache compiled output so that
              // subsequent compile runs are much faster
              cacheDirectory: true
            }
          }
        ]
      },
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
      },
      {
        // Load translations files with custom loader, to extract and apply
        // fallbacks
        test: /locales\/(\w{2}(-\w{2})?)\.json$/,
        use: [
          {
            loader: path.resolve('frontend/translations-loader.js')
          }
        ]
      },
      // Allow for injection of modules dependencies by reading contents of
      // modules directory and adding necessary dependencies
      {
        test: path.join(__dirname, 'modules/modules-main.js'),
        use: [
          {
            loader: 'val-loader'
          }
        ]
      },
      {
        test: path.join(__dirname, 'modules/modules-ide.js'),
        use: [
          {
            loader: 'val-loader'
          }
        ]
      },
      {
        // Expose jQuery and $ global variables
        test: require.resolve('jquery'),
        use: [
          {
            loader: 'expose-loader',
            options: 'jQuery'
          },
          {
            loader: 'expose-loader',
            options: '$'
          }
        ]
      },
      {
        // Expose angular global variable
        test: require.resolve('angular'),
        use: [
          {
            loader: 'expose-loader',
            options: 'angular'
          }
        ]
      }
    ]
  },
  resolve: {
    alias: {
      // Aliases for AMD modules

      // Shortcut to vendored dependencies in frontend/js/vendor/libs
      libs: path.join(__dirname, 'frontend/js/vendor/libs'),
      // Enables ace/ace shortcut
      ace: 'ace-builds/src-noconflict'
    }
  },

  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        defaultVendors: {
          test: /\/node_modules\/|\/vendor\//,
          minChunks: 1,
          enforce: true
        }
      }
    }
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

    // Silence react messages in the dev-tools console
    new webpack.DefinePlugin({
      __REACT_DEVTOOLS_GLOBAL_HOOK__: '({ isDisabled: true })'
    }),

    new webpack.DefinePlugin({
      // CSP fix for regenerator, bundled inside ES5 compatible pdf.js
      regeneratorRuntime: 'window.regeneratorRuntime'
    }),

    // Prevent moment from loading (very large) locale files that aren't used
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/
    }),

    new CopyPlugin(
      [
        // Copy CMap files from pdfjs-dist package to build output. These are used
        // to provide support for non-Latin characters
        'pdfjs-dist/cmaps',
        // optional package ace files - minified: keymaps, modes, themes, worker
        'ace-builds/src-min-noconflict'
      ]
        .map(path => {
          return { from: `node_modules/${path}`, to: `${VENDOR_PATH}/${path}` }
        })
        .concat([
          {
            from: 'node_modules/pdfjs-dist/es5/build/pdf.worker.js',
            to: path.join(
              __dirname,
              '/public/js/pdfjs-dist/es5/build/pdf.worker.js'
            )
          }
        ])
        .concat(
          ['mathjax', 'sigma-master'].map(path => {
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
