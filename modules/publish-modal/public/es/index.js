import PublishModal from './src/components/publish_modal'
import ReactDOM from 'react-dom'
import React from 'react'

export function init (rootEl, initParams) {
  $.ajax({
    url: '/journals',
    type: 'GET',
    success: function (jsonResponse) {
      var entries = JSON.parse(jsonResponse)
      var props = {
        entries: entries,
        initialShown: 'basic',
        initParams: initParams
      }
      ReactDOM.render(
        React.createElement(PublishModal, props),
        rootEl
      )
    }
  })
}
