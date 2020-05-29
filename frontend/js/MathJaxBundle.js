import MathJax from 'libs/mathjax/MathJax'
import 'libs/mathjax/config/Safe'
import 'libs/mathjax/config/TeX-AMS_HTML'
import 'libs/mathjax/extensions/Safe'
import 'libs/mathjax/jax/output/HTML-CSS/jax'
// fontdata has a circular dependency on jax internals, skip bundling
// import 'libs/mathjax/jax/output/HTML-CSS/fonts/TeX/fontdata'

MathJax.Hub.Config({
  messageStyle: 'none',
  imageFont: null,
  'HTML-CSS': {
    availableFonts: ['TeX'],
    // MathJax's automatic font scaling does not work well when we render math
    // that isn't yet on the page, so we disable it and set a global font
    // scale factor
    scale: 110,
    matchFontHeight: false
  },
  TeX: {
    equationNumbers: { autoNumber: 'AMS' },
    useLabelIDs: false
  },
  skipStartupTypeset: true,
  tex2jax: {
    processEscapes: true,
    // Dollar delimiters are added by the mathjax directive
    inlineMath: [['\\(', '\\)']],
    displayMath: [
      ['$$', '$$'],
      ['\\[', '\\]']
    ]
  }
})
MathJax.Hub.Configured()
export default MathJax
