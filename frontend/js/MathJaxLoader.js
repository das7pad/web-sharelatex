import staticPath from './utils/staticPath'

let pending

export function loadMathJax() {
  if (pending) return pending

  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = staticPath('/esbuild/js/MathJaxBundle.js')
    script.onload = () => resolve(window.MathJax)
    script.onerror = error => {
      pending = undefined
      reject(new Error(`Cannot load MathJax: ${error.message}`))
    }
    document.body.appendChild(script)
  })
  return pending
}
