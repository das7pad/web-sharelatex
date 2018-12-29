/* global $ */
import React, { PropTypes, Component } from 'react'
import ReturnButton from './return_button'
import { initiateExport } from '../utils'

export default class F1000Export extends Component {
  constructor(props) {
    super(props)
    this.state = {
      exportState: 'unintiated',
      errorDetails: null
    }
  }

  runExport(entry, projectId) {
    this.setState({ exportState: 'initiated' })

    initiateExport(entry, projectId)
      .then(({ authorEmail, authorName, title }) => {
        this.setState({ exportState: 'complete' })

        $.ajax({
          url: this.props.entry.export_url,
          method: 'GET',
          data: {
            authorEmail,
            authorName,
            title,
            articleZipURL: `/project/${projectId}/export/${entry.id}/zip`,
            pdfURL: `/project/${projectId}/export/${entry.id}/pdf`,
            revisionURL:
              'https://www.overleaf.com/learn/how-to/Overleaf_v2_FAQ',
            submissionURL: '',
            publicationURL: '',
            rejectionURL: '',
            newVersionURL: '',
            articleId: ''
          }
        })
      })
      .catch(({ errorDetails }) => {
        this.setState({
          exportState: 'error',
          errorDetails
        })
      })
  }

  renderUnintiated(entry, projectId) {
    return (
      <span>
        <p>Thanks for using Overleaf to write your article.</p>
        <p>
          When you are ready to submit, then click
          <strong> Send to {entry.name}</strong> below. (Your files will be sent
          to {entry.name} by Overleaf)
        </p>
        <button
          className="btn btn-primary"
          onClick={() => this.runExport(entry, projectId)}
        >
          Submit to {entry.name}
        </button>
      </span>
    )
  }

  renderInitiated() {
    return (
      <span>
        <div style={{ fontSize: 20, margin: '20px 0px 20px' }}>
          <i className="fa fa-refresh fa-spin fa-fw" />
          <span> &nbsp; Exporting files, please wait...</span>
        </div>
      </span>
    )
  }

  renderComplete() {
    return <span data-testid="export-complete" />
  }

  renderError() {
    return (
      <span>
        <p>Export Failed</p>
        <p>Error message: {this.state.errorDetails}</p>
      </span>
    )
  }

  render() {
    const { entry, onReturn, projectId, returnText } = this.props
    let body
    if (this.state.exportState === 'unintiated') {
      body = this.renderUnintiated(entry, projectId)
    } else if (this.state.exportState === 'initiated') {
      body = this.renderInitiated(entry, projectId)
    } else if (this.state.exportState === 'complete') {
      body = this.renderComplete()
    } else {
      body = this.renderError()
    }

    return (
      <div
        className="publish-guide modal-body-content row content-as-table"
        key={entry.id}
      >
        <div className="col-sm-12">
          <ReturnButton onReturn={onReturn} returnText={returnText} />
          <h3 style={{ marginTop: '5px' }}>
            Submit to: <br />
            <strong> {entry.name} </strong>
          </h3>
          {body}
        </div>
      </div>
    )
  }
}

F1000Export.propTypes = {
  entry: PropTypes.object.isRequired,
  returnText: PropTypes.string,
  onReturn: PropTypes.func,
  projectId: PropTypes.string.isRequired
}
