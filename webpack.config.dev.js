const Path = require('path')
const { URL } = require('url')
const Settings = require('settings-sharelatex')
const merge = require('webpack-merge')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const base = require('./webpack.config')

module.exports = merge(base, {
  mode: 'development',

  // Enable source maps for dev (fast compilation, slow runtime)
  devtool: 'cheap-module-eval-source-map',

  plugins: [
    // Extract CSS to a separate file (rather than inlining to a <style> tag)
    new MiniCssExtractPlugin({
      // Output to public/stylesheets directory
      filename: 'stylesheets/[name].css'
    })
  ],

  devServer: {
    // Disable webpack dev server auto-reload
    inline: false,

    // serve regular static files too
    contentBase: Path.join(__dirname, 'public'),

    // Expose dev server as localhost with dev box
    host: '0.0.0.0',
    port: 3808,

    // Server from all hosts and emit CORS headers, e.g. for fonts
    disableHostCheck: true,
    headers: {
      'Access-Control-Allow-Origin': new URL(Settings.siteUrl).origin
    },

    // Customise output to the (node) console
    stats: {
      colors: true, // Enable some coloured highlighting
      // Hide some overly verbose output
      performance: false, // Disable as code is uncompressed in dev mode
      hash: false,
      version: false,
      chunks: false,
      modules: false,
      // Hide copied assets from output
      excludeAssets: [/vendor/]
    }
  }
})
