import App from '../base'
import getMeta from '../utils/meta'

export default App.factory('validateCaptchaV3', function () {
  const grecaptcha = window.grecaptcha
  return function validateCaptchaV3(actionName, callback = () => {}) {
    if (!grecaptcha) {
      return
    }
    const recaptchaSiteKeyV3 = getMeta('ol-recaptchaSiteKeyV3')
    if (!recaptchaSiteKeyV3) {
      return
    }
    grecaptcha.ready(function () {
      grecaptcha
        .execute(recaptchaSiteKeyV3, { action: actionName })
        .then(callback)
    })
  }
})
