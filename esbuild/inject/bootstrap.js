/**
 * Provide $/angular as globals and use full jQuery in angular.
 */
/* global require */
const $ = require('jquery')

// Provide `$` globally w/o explicit import.
export { $ }

// angular will read jQuery from window.
window.jQuery = $
require('angular')

// Provide `angular` globally w/o explicit import.
export const angular = window.angular
