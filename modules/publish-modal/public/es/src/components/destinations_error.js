import React, { Component } from 'react'

export default class DestinationsError extends Component {
  render() {
    return (
      <span>
        <p>
          Sorry, we had trouble retrieving our list of submission destinations.
          If you give us a minute, retry, and still find this error, please
          notify support at{' '}
          <a href="mailto:support@overleaf.com?subject=Unable to submit">
            support@overleaf.com
          </a>
        </p>
      </span>
    )
  }
}
