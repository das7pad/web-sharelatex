// Enforce a base url for the loading of sub sources.
// There is a heuristic built into MathJax for the detection of the url of this
//  script, but it breaks for a minified blob stored at the root level.
import 'mathjax'
import staticPath from './utils/staticPath'

// NOTE: mathjax v2 does not expose ES6 import. Use window access instead.
// NOTE: Changing the base url invalidates the cache of preloaded sub
//        resources, like configs/extensions.
//       We are required to change it here - before any dependent is loaded.
window.MathJax.Ajax.config.root = staticPath('/vendor/mathjax-2-7-9')

export const MathJaxWithStaticPath = window.MathJax
