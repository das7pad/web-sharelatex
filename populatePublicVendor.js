const Path = require('path')
const fsExtra = require('fs-extra')

const VENDOR_PATH = Path.join(__dirname, 'public', 'vendor')

const PATTERNS = []
  .concat(
    [
      // pdfjs worker
      'pdfjs-dist/build/pdf.worker.min.js',
      // Copy CMap files from pdfjs-dist package to build output.
      // These are used to provide support for non-Latin characters
      'pdfjs-dist/cmaps/',

      // lazy loaded ace files -- minified: keymaps, modes, themes, worker
      'ace-builds/src-min-noconflict/'
    ].map(path => {
      return { from: `node_modules/${path}`, to: `${VENDOR_PATH}/${path}` }
    })
  )
  .concat(
    // Copy the required files for loading MathJax from MathJax NPM package
    [
      'extensions/a11y/',
      'extensions/HelpDialog.js',
      'fonts/HTML-CSS/TeX/woff/',
      'jax/output/HTML-CSS/fonts/TeX/'
    ].map(from => {
      return {
        context: 'node_modules/mathjax',
        from,
        to: `${VENDOR_PATH}/mathjax`
      }
    })
  )
  .concat(
    [
      // admin-panel
      'sigma-master/'
    ].map(path => {
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
  .map(({ from, to, context }) => {
    if (context) {
      to = Path.join(to, from)
      from = Path.join(context, from)
    }
    return { from, to }
  })

module.exports = { PATTERNS }

if (require.main === module) {
  for (let { from, to } of PATTERNS) {
    fsExtra.copySync(from, to)
  }
}
