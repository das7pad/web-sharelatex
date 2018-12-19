/* global $ */
import React, { PropTypes, Component } from 'react'
import ReturnButton from './return_button'
import { initiateExport } from '../utils'

export default class F1000Export extends Component {
  constructor(props) {
    super(props)
    this.state = {
      exportState: 'unintiated',
      submissionValid: true,
      errorDetails: null,
      exportId: null,
      partnerName: null,
      partnerContactURL: null,
      authorEmail: null,
      authorName: null,
      title: null,
      articleZipURL: null,
      pdfURL: null,
      revisionURL: 'https://www.overleaf.com/learn/how-to/Overleaf_v2_FAQ',
      token: null
    }
  }

  runExport(entry, projectId) {
    initiateExport(entry, projectId, this)
  }

  componentDidUpdate() {
    if (this.state.exportState === 'complete') {
      $('#export_form').submit()
    }
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

  renderComplete(entry) {
    return (
      <span>
        <form action={entry.export_url} method="get" id="export_form">
          <input
            id="authorEmail"
            name="authorEmail"
            type="hidden"
            value={this.state.authorEmail}
          />
          <input
            id="authorName"
            name="authorName"
            type="hidden"
            value={this.state.authorName}
          />
          <input
            id="title"
            name="title"
            type="hidden"
            value={this.state.title}
          />
          <input
            id="articleZipURL"
            name="articleZipURL"
            type="hidden"
            value={this.state.articleZipURL}
          />
          <input
            id="pdfURL"
            name="pdfURL"
            type="hidden"
            value={this.state.pdfURL}
          />
          <input
            id="revisionURL"
            name="revisionURL"
            type="hidden"
            value={this.state.revisionURL}
          />
          <input
            id="submissionURL"
            name="submissionURL"
            type="hidden"
            value=""
          />
          <input
            id="publicationURL"
            name="publicationURL"
            type="hidden"
            value=""
          />
          <input id="rejectionURL" name="rejectionURL" type="hidden" value="" />
          <input
            id="newVersionURL"
            name="newVersionURL"
            type="hidden"
            value=""
          />
          <input id="articleId" name="articleId" type="hidden" value="" />
        </form>
      </span>
    )
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
      body = this.renderComplete(entry)
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
