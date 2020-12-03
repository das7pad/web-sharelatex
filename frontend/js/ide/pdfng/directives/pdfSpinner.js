/* eslint-disable
    max-len,
    no-unused-vars,
    no-useless-constructor,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import App from '../../../base'

export default App.factory('pdfSpinner', function() {
  let pdfSpinner
  return (pdfSpinner = class pdfSpinner {
    constructor() {}
    // handler for spinners

    add(element, options) {
      const spinner = $(
        `<div class="pdfng-spinner"><i class="fa fa-spinner${
          options && options.static ? '' : ' fa-spin'
        }"/></div>`
      )
      return element.append(spinner)
    }

    start(element) {
      return element.find('.fa-spinner').addClass('fa-spin')
    }

    stop(element) {
      return element.find('.fa-spinner').removeClass('fa-spin')
    }

    remove(element) {
      return element.find('.fa-spinner').remove()
    }
  })
})
