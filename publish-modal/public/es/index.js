import PublishModal from './src/components/publish_modal'
import ReactDOM from 'react-dom'
import React from 'react'

export function init (rootEl) {
  // TODO - ajax call to v1 endpoint for data
  var props = {
    entries: {},
    docKey: '',
    initialShown: 'basic'
  }

  ReactDOM.render(
    React.createElement(PublishModal, props),
    rootEl
  )
}
