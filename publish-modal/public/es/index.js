import PublishModal from './src/components/publish_modal'
import ReactDOM from 'react-dom'
import React from 'react'

export function init (rootEl, projectId) {
  var xhttp = new XMLHttpRequest()
  xhttp.onreadystatechange = function () {
    if (this.readyState === 4 && this.status === 200) {
      var entries = JSON.parse(this.responseText)
      var props = {entries: entries,
        projectId: projectId,
        initialShown: 'basic'
      }
      ReactDOM.render(
        React.createElement(PublishModal, props),
        rootEl
      )
    }
  }
  xhttp.open('GET', '/journals', true)
  xhttp.send()
}
