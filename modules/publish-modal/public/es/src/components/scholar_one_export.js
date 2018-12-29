/* global $, FormData */
import React, { PropTypes, Component } from 'react'
import ReturnButton from './return_button'
import { initiateExport2 } from '../utils'

export default class ScholarOneExport extends Component {
  constructor(props) {
    super(props)
    this.state = {
      exportState: 'unintiated',
      errorDetails: null
    }
  }

  runExport(entry, projectId) {
    this.setState({ exportState: 'initiated' })

    initiateExport2(entry, projectId)
      .then(({ exportId, token, submissionId }) => {
        this.setState({ exportState: 'complete' })

        const formData = new FormData()
        formData.append('export_id', `${exportId}${token}`)
        formData.append('submission_id', submissionId)
        formData.append('EXT_ACTION', 'OVERLEAF_SUBMISSION')

        $.ajax({
          url: this.props.entry.export_url,
          method: 'POST',
          contentType: 'multipart/form-data',
          data: formData
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
        <p>Thanks for using Overleaf to submit your article.</p>
        <p>
          Use the button below to send a PDF of your paper and a ZIP file of the
          LaTeX source files to the journal’s submission site.
        </p>
        <p>Log In or Create an Account on the next screen.</p>

        <p>
          {' '}
          Once you have logged in,
          <ul>
            <li>
              If you have just started, you will be on the first step of the
              submission process and your files will be automatically attached.
            </li>
            <li>
              If you have edited an existing project, you will be on the step
              where the Overleaf files are replaced by your latest version.
            </li>
          </ul>
        </p>
        <br />
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

ScholarOneExport.propTypes = {
  entry: PropTypes.object.isRequired,
  returnText: PropTypes.string,
  onReturn: PropTypes.func,
  projectId: PropTypes.string.isRequired
}
