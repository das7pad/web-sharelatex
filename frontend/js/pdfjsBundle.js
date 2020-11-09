/*
  Inject the worker path, pointing to the CDN and init a global Worker instance
 */

import pdfjsBundle from 'pdfjs-dist'
import staticPath from './utils/staticPath'

// Load the worker from the CDN
pdfjsBundle.GlobalWorkerOptions.workerSrc = staticPath(
  '/vendor/pdfjs-dist/build/pdf.worker.min.js'
)

if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsBundle.worker = new pdfjsBundle.PDFWorker()
}

export default pdfjsBundle
