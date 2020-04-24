/*
  Inject the worker path and load the worker with a low priority
 */
define(['pdfjs-dist/build/pdf.js'], function(pdfjsBundle) {
  pdfjsBundle.GlobalWorkerOptions.workerSrc = `${window.staticPath}vendor/pdfjs-dist/build/pdf.worker.min.js`
  if (typeof window !== 'undefined' && 'Worker' in window) {
    // preload the worker with a low priority
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.as = 'script'
    link.href = pdfjsBundle.GlobalWorkerOptions.workerSrc
    link.onload = () => {
      pdfjsBundle.worker = new pdfjsBundle.PDFWorker()
    }
    document.head.appendChild(link)
  }
  return pdfjsBundle
})
