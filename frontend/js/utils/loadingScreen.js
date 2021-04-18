export default function showFakeProgress() {
  setTimeout(function () {
    const loadingScreen = document.getElementById('loadingScreen')
    if (!loadingScreen) return

    loadingScreen.classList.add('loading-screen-brand-20')
    setTimeout(() => {
      loadingScreen.classList.add('loading-screen-brand-50')
      setTimeout(() => {
        loadingScreen.classList.add('loading-screen-brand-75')
      }, 10000)
    }, 1000)
  }, 500)
}
