define([
  'libs/mathjax/MathJax',
  'libs/mathjax/config/Safe',
  'libs/mathjax/config/TeX-AMS_HTML',
  'libs/mathjax/extensions/Safe',
  'libs/mathjax/jax/output/HTML-CSS/jax'
  // fontdata has a circular dependency on jax internals, skip bundling
  // 'libs/mathjax/jax/output/HTML-CSS/fonts/TeX/fontdata'
], function (MathJax) {
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
  return MathJax
})
