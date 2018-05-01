import PublishModal from './src/components/publish_modal'
import ReactDOM from 'react-dom'
import React from 'react'

export function init (rootEl, projectId) {
  $.ajax({
    url: '/journals',
    type: 'GET',
    success: function (jsonResponse) {
      var entries = JSON.parse(jsonResponse)
      var props = {entries: entries,
        projectId: projectId,
        initialShown: 'basic'
      }
      ReactDOM.render(
        React.createElement(PublishModal, props),
        rootEl
      )
    }
  })
}
