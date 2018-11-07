import PublishModal from './src/components/publish_modal'
import ReactDOM from 'react-dom'
import React from 'react'

export function init (rootEl, initParams, publishModalConfig) {
  if (!publishModalConfig.isBranded) {
    _initBasic(
      rootEl,
      initParams
    )
  } else if (publishModalConfig.brandedMenu) {
    _initForBrand(
      rootEl,
      initParams,
      publishModalConfig.brandId
    )
  } else if (publishModalConfig.partner) {
    _initForExport(
      rootEl,
      initParams,
      publishModalConfig.brandId,
      publishModalConfig.brandVariationId
    )
  } else {
    _initForGuide(
      rootEl,
      initParams,
      publishModalConfig.brandId,
      publishModalConfig.brandVariationId
    )
  }
}

function _initBasic (rootEl, initParams) {
  const url = '/journals'
  _getJournalsAndRender(url, rootEl, initParams, null, 'basic')
}

function _initForBrand (rootEl, initParams, brandId) {
  const url = `/journals/${ brandId }`
  _getJournalsAndRender(url, rootEl, initParams, null, 'branded')
}

function _initForGuide (rootEl, initParams, brandId, brandVariationId) {
  const url = `/journals/${ brandId }`
  _getJournalsAndRender(url, rootEl, initParams, brandVariationId, 'guide')
}

function _initForExport (rootEl, initParams, brandId, brandVariationId) {
  const url = `/journals/${ brandId }`
  _getJournalsAndRender(url, rootEl, initParams, brandVariationId, 'export')
}

function _getJournalsAndRender (url, rootEl, initParams, brandVariationId, initialShown) {
  $.ajax({
    url: url,
    type: 'GET',
    success: function (jsonResponse) {
      var entries = JSON.parse(jsonResponse)
      var props = {
        entries: entries,
        initialShown: initialShown,
        initParams: initParams,
        brandVariationId: brandVariationId
      }
      ReactDOM.render(
        React.createElement(PublishModal, props),
        rootEl
      )
    }
  })
}
