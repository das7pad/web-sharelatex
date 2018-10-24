/* global sinon */

export function stubMathJax () {
  // fake MathJax so we don't have to load it into the test harness
  window.MathJax = {
    Hub: {
      Queue: sinon.stub()
    },
    InputJax: {}
  }
}

export function teardownMathJax () {
  window.MathJax = null
}
