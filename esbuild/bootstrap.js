const jQuery = require('jquery')

export { jQuery, jQuery as $ }

window.jQuery = jQuery
require('angular')

export const angular = window.angular
