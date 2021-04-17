/**
 * ES6 imports are not strictly sorted. Use require statements instead.
 */
const jQuery = require('jquery')

// provide `jQuery` and `$` globally w/o import
export { jQuery, jQuery as $ }

window.jQuery = jQuery
require('angular')

// provide `angular` globally w/o import
export const angular = window.angular
