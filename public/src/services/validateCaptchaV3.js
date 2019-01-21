define(['base'], function(App) {
  return App.factory('validateCaptchaV3', function() {
    const grecaptcha = window.grecaptcha
    const ExposedSettings = window.ExposedSettings
    var validateCaptchaV3 = function validateCaptchaV3(actionName, callback) {
      if (callback == null) {
        callback = function callback(response) {}
      }
      if (typeof grecaptcha === 'undefined' || grecaptcha === null) {
        return
      }
      if (
        typeof ExposedSettings === 'undefined' ||
        typeof ExposedSettings.recaptchaSiteKeyV3 === 'undefined'
      ) {
        return
      }
      grecaptcha.ready(function() {
        grecaptcha
          .execute(ExposedSettings.recaptchaSiteKeyV3, { action: actionName })
          .then(callback)
      })
    }
    return validateCaptchaV3
  })
})
