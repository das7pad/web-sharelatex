import App from '../base'
import { loadMathJax } from '../MathJaxLoader'
import getMeta from '../utils/meta'

if (getMeta('ol-preLoadMathJax')) {
  // preload mathJax for e.g. /learn pages
  // eslint-disable-next-line no-unused-expressions
  loadMathJax().catch(() => {})
}
export default App.directive('mathjax', function ($compile, $parse) {
  return {
    link(scope, element) {
      loadMathJax()
        .then(MathJax => {
          setTimeout(() => {
            MathJax.Hub.Queue(['Typeset', MathJax.Hub, element.get(0)])
          }, 0)
        })
        .catch(() => {})
    },
  }
})
