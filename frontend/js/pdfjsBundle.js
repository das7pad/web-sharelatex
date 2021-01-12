/*
  Inject the worker path, pointing to the CDN and init a global Worker instance
 */

import * as pdfjsBundle from 'pdfjs-dist/es5/build/pdf'
import staticPath from './utils/staticPath'

// Load the worker from the CDN
pdfjsBundle.GlobalWorkerOptions.workerSrc = staticPath(
  '/vendor/pdfjs-dist/es5/build/pdf.worker.js'
)

const hasWorkerSupport = typeof window !== 'undefined' && 'Worker' in window
export const worker = hasWorkerSupport && new pdfjsBundle.PDFWorker()

export default pdfjsBundle
