import React, { Component } from 'react'

export default class DestinationsError extends Component {
  render() {
    return (
      <span>
        <p>
          We had trouble retrieving our list of submission destinations. If you
          give us a minute, retry, and still find this error, please notify us
          using our
          <a href="/contact">contact form</a>
          or via email to
          <a href="mailto:support@overleaf.com">support@overleaf.com</a>
        </p>
        <p>Please excuse. We'll try to make this go away quickly.</p>
      </span>
    )
  }
}
