/*
  Inject the worker path and load the worker with a low priority
 */
define(['pdfjs-dist/build/pdf.js'], function(pdfjsBundle) {
  pdfjsBundle.GlobalWorkerOptions.workerSrc = window.pdfjsWorkerSrc
  function prefetchWorker() {
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.as = 'script'
    link.href = window.pdfjsWorkerSrc
    document.head.append(link)
  }
  // preload the worker with a low priority
  prefetchWorker()
  return pdfjsBundle
})
