/**
 * Provide $/jQuery/angular as globals and use full jQuery in angular.
 */
const jQuery = require('jquery')

// Provide `jQuery` and `$` globally w/o explicit import.
export { jQuery, jQuery as $ }

// angular will read jQuery from window.
window.jQuery = jQuery
require('angular')

// Provide `angular` globally w/o explicit import.
export const angular = window.angular
