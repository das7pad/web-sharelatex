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
  let props = {
    initialShown: initialShown,
    initParams: initParams,
    brandVariationId: brandVariationId
  }
  const showPublishModal = jsonResponse => {
    let entries = JSON.parse(jsonResponse)
    props.entries = entries
    ReactDOM.render(React.createElement(PublishModal, props), rootEl)
  }
  const aggregateProps = template => {
    props.initParams.description = template.description
    props.initParams.author = template.author
    props.initParams.license = template.license
  }
  // TODO create an error component to render here instead
  const showError = jsonResponse => {
    let entries = JSON.parse(jsonResponse)
    props.entries = entries
    ReactDOM.render(React.createElement(PublishModal, props), rootEl)
  }
  promiseAjaxGet(url)
    .then(jsonResponse => {
      let template_url = `/latest_template/${initParams.projectId}`
      promiseAjaxGet(template_url)
        .then(aggregateProps)
        .catch(e => {
          // retrieval of prior submission is not essential
          console.log('Failed retrieval prior submission for this project ', e)
        })
      return jsonResponse
    })
    .then(showPublishModal)
    .catch(showError)
}

function promiseAjaxGet(url) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: url,
      type: 'GET'
    })
      .done(resolve)
      .fail(reject)
  })
}
