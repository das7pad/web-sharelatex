/* eslint-disable
    camelcase,
    max-len,
    no-return-assign,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base'], function(App) {
  const _cobrandingData = window.brandVariation

  return App.factory('CobrandingDataService', function() {
    const isProjectCobranded = () => _cobrandingData != null

    const getLogoImgUrl = () =>
      _cobrandingData != null ? _cobrandingData.logo_url : undefined

    const getSubmitBtnHtml = () =>
      _cobrandingData != null ? _cobrandingData.submit_button_html : undefined

    const getBrandVariationName = () =>
      _cobrandingData != null ? _cobrandingData.name : undefined

    const getBrandVariationHomeUrl = () =>
      _cobrandingData != null ? _cobrandingData.home_url : undefined

    return {
      isProjectCobranded,
      getLogoImgUrl,
      getSubmitBtnHtml,
      getBrandVariationName,
      getBrandVariationHomeUrl
    }
  })
})
