import App from '../base'
import showFakeProgress from '../utils/loadingScreen'
App.directive('autoSubmitForm', function() {
  return {
    link(scope, element) {
      showFakeProgress()
      element.submit() // Runs on load
    }
  }
})
