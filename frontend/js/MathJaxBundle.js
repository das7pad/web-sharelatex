import { MathJaxWithStaticPath as MathJax } from './MathJaxWithStaticPath'
import 'mathjax/config/Safe'
import 'mathjax/config/TeX-AMS_HTML'
import 'mathjax/extensions/Safe'
import 'mathjax/jax/output/HTML-CSS/jax'
// fontdata has a circular dependency on jax internals, skip bundling
// import 'mathjax/jax/output/HTML-CSS/fonts/TeX/fontdata'

MathJax.Hub.Config({
  messageStyle: 'none',
  imageFont: null,
  // Fast preview, introduced in 2.5, is unhelpful due to extra codemirror refresh
  // and disabling it avoids issues with math processing errors
  // github.com/overleaf/write_latex/pull/1375
  'fast-preview': { disabled: true },
  'HTML-CSS': {
    availableFonts: ['TeX'],
    // MathJax's automatic font scaling does not work well when we render math
    // that isn't yet on the page, so we disable it and set a global font
    // scale factor
    scale: 110,
    matchFontHeight: false,
  },
  TeX: {
    equationNumbers: { autoNumber: 'AMS' },
    useLabelIDs: false,
  },
  skipStartupTypeset: true,
  tex2jax: {
    processEscapes: true,
    // Dollar delimiters are added by the mathjax directive
    inlineMath: [
      ['\\(', '\\)'],
      ['$', '$'],
    ],
    displayMath: [
      ['$$', '$$'],
      ['\\[', '\\]'],
    ],
  },
})
MathJax.Hub.Configured()
export default MathJax
