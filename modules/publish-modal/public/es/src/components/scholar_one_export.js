/* global $ */
import React, { PropTypes, Component } from 'react'
import ReturnButton from './return_button'
import { initiateExport } from '../utils'

export default class ScholarOneExport extends Component {
  constructor(props) {
    super(props)
    this.state = {
      exportState: 'uninitiated',
      errorDetails: null
    }
  }

  runExport(entry, projectId) {
    this.setState({ exportState: 'initiated' })

    initiateExport(entry, projectId)
      .then(({ exportId, token, submissionId }) => {
        this.setState({
          exportState: 'complete',
          exportId: `${exportId}${token}`,
          submissionId: submissionId
        })
      })
      .catch(({ errorDetails }) => {
        this.setState({
          exportState: 'error',
          errorDetails
        })
      })
  }

  componentDidUpdate() {
    if (this.state.exportState === 'complete') {
      // When the completion form is rendered, submit it by clicking the submit
      // button.
      // This needs to be done via a form submission because ScholarOne will
      // respond with their log in form html, which the browser will then
      // render. It cannot be done via XHR.
      // It needs to be button.click(), not a direct call to form.submit()
      // because React's synthetic events system seems to propagate the submit
      // event up to the window. This means that in the tests, we cannot prevent
      // the event navigating the page, which is something that Karma does not
      // like.
      this.submitButton.click()
    }
  }

  renderUninitiated(entry, projectId) {
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
    return (
      <form
        action={this.props.entry.export_url}
        method="post"
        id="export_form"
        data-testid="export-complete"
      >
        <input
          id="export_id"
          name="export_id"
          type="hidden"
          value={this.state.exportId}
        />
        <input
          id="submission_id"
          name="submission_id"
          type="hidden"
          value={this.state.submissionId}
        />
        <input
          id="EXT_ACTION"
          name="EXT_ACTION"
          type="hidden"
          value="OVERLEAF_SUBMISSION"
        />
        <button
          style={{ display: 'none' }}
          ref={button => {
            this.submitButton = button
          }}
        >
          Submit
        </button>
      </form>
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
    if (this.state.exportState === 'uninitiated') {
      body = this.renderUninitiated(entry, projectId)
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
