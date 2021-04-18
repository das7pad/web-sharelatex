import getMeta from './utils/meta'

let pending

export function loadMathJax() {
  if (pending) return pending

  pending = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = getMeta('ol-mathJaxEntrypoint')
    script.onload = () => resolve(window.MathJax)
    script.onerror = error => {
      pending = undefined
      reject(new Error(`Cannot load MathJax: ${error.message}`))
    }
    document.body.appendChild(script)
  })
  return pending
}
