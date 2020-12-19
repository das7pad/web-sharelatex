/*
  Inject the worker path, pointing to the CDN and init a global Worker instance
 */

import pdfjsBundle from 'pdfjs-dist/es5/build/pdf'
import staticPath from './utils/staticPath'

// Load the worker from the CDN
pdfjsBundle.GlobalWorkerOptions.workerSrc = staticPath(
  '/js/pdfjs-dist/es5/build/pdf.worker.js'
)

if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsBundle.worker = new pdfjsBundle.PDFWorker()
}

export default pdfjsBundle
