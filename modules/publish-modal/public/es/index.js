import PublishModal from './src/components/publish_modal'
import ReactDOM from 'react-dom'
import React from 'react'

export function init(rootEl, initParams, publishModalConfig) {
  if (!publishModalConfig.isBranded) {
    _initBasic(rootEl, initParams)
  } else if (publishModalConfig.brandedMenu) {
    _initForBrand(rootEl, initParams, publishModalConfig.brandId)
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

function _initBasic(rootEl, initParams) {
  const url = '/journals'
  _getJournalsAndRender(url, rootEl, initParams, null, 'basic')
}

function _initForBrand(rootEl, initParams, brandId) {
  const url = `/journals/${brandId}`
  _getJournalsAndRender(url, rootEl, initParams, null, 'branded')
}

function _initForGuide(rootEl, initParams, brandId, brandVariationId) {
  const url = `/journals/${brandId}`
  _getJournalsAndRender(url, rootEl, initParams, brandVariationId, 'guide')
}

function _initForExport(rootEl, initParams, brandId, brandVariationId) {
  const url = `/journals/${brandId}`
  _getJournalsAndRender(url, rootEl, initParams, brandVariationId, 'export')
}

function _getJournalsAndRender(
  url,
  rootEl,
  initParams,
  brandVariationId,
  initialShown
) {
  const showPublishModal = jsonResponse => {
    let entries = JSON.parse(jsonResponse)
    let props = {
      entries: entries,
      initialShown: initialShown,
      initParams: initParams,
      brandVariationId: brandVariationId
    }
    ReactDOM.render(React.createElement(PublishModal, props), rootEl)
  }
  const showError = jsonResponse => {
    // TODO create an error component to render here instead
    let props = {
      entries: entries,
      initialShown: initialShown,
      initParams: initParams,
      brandVariationId: brandVariationId
    }
    ReactDOM.render(React.createElement(PublishModal, props), rootEl)
  }
  promiseJournalsRequest(url).then(showPublishModal, showError)
}

function promiseJournalsRequest(url) {
  return new Promise((resolve, reject) => {
    console.log('RETRIEVE JOURNAL LIST ', url)
    $.ajax({
      url: url,
      type: 'GET'
    })
      .done(resolve)
      .fail(reject)
  })
}

function promisePriorSubmissionRequest(projectId) {
  return new Promise((resolve, reject) => {
    let url = `/latest_template/{projectId}`
    console.log('RETRIEVE LATEST SUBMISSION ', url)
    $.ajax({
      url: url,
      type: 'GET',
      success: function(jsonResponse) {
        var template = JSON.parse(jsonResponse)
        console.log('LATEST TEMPLATE RETURNED ', template)
        props.description = template.description
        props.author = template.author
        props.license = template.license
      }
    })
  })
}
