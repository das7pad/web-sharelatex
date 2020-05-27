const fs = require('fs')
const path = require('path')
const webpack = require('webpack')
const CopyPlugin = require('copy-webpack-plugin')
const ManifestPlugin = require('webpack-manifest-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const AutoPrefixer = require('autoprefixer')

const PackageVersions = require('./app/src/infrastructure/PackageVersions')

const NODE_MODULES = path.join(__dirname, 'node_modules')
const MODULES_PATH = path.join(__dirname, '/modules')
const VENDOR_PATH = path.join(__dirname, 'public', 'vendor')

// Generate a hash of entry points, including modules
const entryPoints = {
  main: './frontend/js/main.js',
  ide: './frontend/js/ide.js',
  style: './frontend/stylesheets/style.less',
  'ieee-style': './frontend/stylesheets/ieee-style.less',
  'light-style': './frontend/stylesheets/light-style.less'
}

// Attempt to load frontend entry-points from modules, if they exist
if (fs.existsSync(MODULES_PATH)) {
  fs.readdirSync(MODULES_PATH).reduce((acc, module) => {
    const entryPath = path.join(MODULES_PATH, module, '/frontend/js/index.js')
    if (fs.existsSync(entryPath)) {
      acc[module] = entryPath
    }
    return acc
  }, entryPoints)
}

module.exports = {
  // Defines the "entry point(s)" for the application - i.e. the file which
  // bootstraps the application
  entry: entryPoints,

  // Define where and how the bundle will be output to disk
  // Note: webpack-dev-server does not write the bundle to disk, instead it is
  // kept in memory for speed
  output: {
    path: path.join(__dirname, '/public'),

    // By default write into js directory
    filename: 'js/[name].js'
  },

  // Define how file types are handled by webpack
  module: {
    noParse: [path.join(NODE_MODULES, 'pdfjs-dist/build/pdf.js')],
    rules: [
      {
        // Pass application JS files through babel-loader, compiling to ES5
        test: /\.js$/,
        // Only compile application files (dependencies are in ES5 already)
        exclude: /node_modules/,
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
      },
      {
        // Expose lodash global variable
        test: require.resolve('lodash'),
        use: [
          {
            loader: 'expose-loader',
            options: '_'
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
      ace: 'ace-builds/src-noconflict',
      // fineupload vendored dependency (which we're aliasing to fineuploadER
      // for some reason)
      fineuploader: path.join(
        __dirname,
        `frontend/js/vendor/libs/${PackageVersions.lib('fineuploader')}`
      )
    }
  },

  // Split out vendored dependencies that are shared between 2 or more "real
  // bundles" (e.g. ide.js/main.js) as a separate "libraries" bundle and ensure
  // that they are de-duplicated from the other bundles. This allows the
  // libraries bundle to be independently cached (as it likely will change less
  // than the other bundles)
  optimization: {
    splitChunks: {
      cacheGroups: {
        ideLibraries: {
          test: /(pdfjsBundle|node_modules\/(ace-builds|pdfjs-dist)|frontend\/js\/vendor\/libs)/,
          name: 'ideLibraries',
          chunks: 'initial',
          reuseExistingChunk: true,
          enforce: true
        },
        libraries: {
          test: /[\\/]node_modules[\\/]|[\\/]frontend[\\/]js[\\/]vendor[\\/]libs[\\/]/,
          name: 'libraries',
          chunks: 'initial',
          minChunks: 2
        }
      }
    }
  },

  plugins: [
    new webpack.ProvidePlugin({
      _: 'lodash'
    }),
    // Generate a manifest.json file which is used by the backend to map the
    // base filenames to the generated output filenames
    new ManifestPlugin({
      filter: function(spec) {
        if (/cmaps/.test(spec.path)) {
          // omit the vendored cmaps
          return
        }
        if (/ace-builds/.test(spec.path)) {
          // omit minified ace source, they are loaded via ace internals
          return
        }
        if (/sigma-master/.test(spec.path)) {
          // loaded via staticPath
          return
        }
        if (/vendor\/mathjax/.test(spec.path)) {
          // booted via MathJaxBundle and then loaded via staticPath
          return
        }
        return spec
      },
      // Always write the manifest file to disk (even if in dev mode, where
      // files are held in memory). This is needed because the server will read
      // this file (from disk) when building the script's url
      writeToFileEmit: true
    }),

    // Prevent moment from loading (very large) locale files that aren't used
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/
    }),

    new CopyPlugin(
      [
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
