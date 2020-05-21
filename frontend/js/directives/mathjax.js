import App from '../base'

if (window.preLoadMathJax) {
  // preload mathJax for e.g. /learn pages
  // eslint-disable-next-line no-unused-expressions
  import(/* webpackChunkName: "MathJaxBundle" */ '../MathJaxBundle')
}
export default App.directive('mathjax', function($compile, $parse) {
  return {
    link(scope, element, attrs) {
      import('../MathJaxBundle').then(MathJax => {
        // Allowing HTML can be unsafe unless using something like
        // `ng-bind-html` because of potential Angular XSS via {{/}}
        if (!$parse(attrs.mathjaxAllowHtml)(scope)) {
          const mathJaxContents = element.html()
          const nonBindableEl = $compile('<span ng-non-bindable></span>')({})
          element.html('').append(nonBindableEl)
          nonBindableEl.html(mathJaxContents)
        }

        if (attrs.delimiter !== 'no-single-dollar') {
          const inlineMathConfig =
            MathJax.Hub.config && MathJax.Hub.config.tex2jax.inlineMath
          const alreadyConfigured = _.find(
            inlineMathConfig,
            c => c[0] === '$' && c[1] === '$'
          )

          if (!alreadyConfigured) {
            MathJax.Hub.Config({
              tex2jax: {
                inlineMath: inlineMathConfig.concat([['$', '$']])
              }
            })
          }
        }

        setTimeout(() => {
          MathJax.Hub.Queue(['Typeset', MathJax.Hub, element.get(0)])
        }, 0)
      })
    }
  }
})
