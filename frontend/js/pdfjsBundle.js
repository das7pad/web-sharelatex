/*
  Inject the worker path, pointing to the CDN and init a global Worker instance
 */

import * as pdfjsBundle from 'pdfjs-dist/build/pdf'
import staticPath from './utils/staticPath'

// Load the worker from the CDN
pdfjsBundle.GlobalWorkerOptions.workerSrc = staticPath(
  '/vendor/pdfjs-dist/build/pdf.worker.min.js'
)

const hasWorkerSupport = typeof window !== 'undefined' && 'Worker' in window
let worker

export function getPDFJSWorker() {
  if (!worker && hasWorkerSupport) {
    worker = new pdfjsBundle.PDFWorker()
  }
  return worker
}

export function preloadPDFJSWorker() {
  getPDFJSWorker()
}

export default pdfjsBundle
