define([
  'libs/underscore',
  'jquery',
  'angular',
  'angular-sanitize',
  'libs/angular-autocomplete/angular-autocomplete',
  'libs/ui-bootstrap',
  'libs/ng-context-menu',
  'libs/algolia',
  'libs/angular-cookie',
  'libs/passfield',
  'libs/ng-tags-input',
  'libs/select/select'
], function(_, jQuery) {
  // eslint-disable-next-line camelcase, no-undef
  __webpack_public_path__ = `${window.staticPath}${__webpack_public_path__}`
  window._ = _
  window.$ = jQuery
  window.jQuery = jQuery
})
