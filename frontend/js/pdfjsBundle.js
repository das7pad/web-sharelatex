/*
  Inject the worker path and load the worker with a low priority
 */

import pdfjsBundle from 'pdfjs-dist'
import staticPath from './utils/staticPath'

// load worker from same origin and prefetch from the cdn
pdfjsBundle.GlobalWorkerOptions.workerSrc =
  '/generate/worker/vendor/pdfjs-dist/build/pdf.worker.min.js'

if (typeof window !== 'undefined' && 'Worker' in window) {
  // preload the worker with a low priority
  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.as = 'script'
  link.href = staticPath('vendor/pdfjs-dist/build/pdf.worker.min.js')
  link.onload = () => {
    pdfjsBundle.worker = new pdfjsBundle.PDFWorker()
  }
  document.head.appendChild(link)
}

export default pdfjsBundle
