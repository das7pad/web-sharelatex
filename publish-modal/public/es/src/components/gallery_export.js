import React, { PropTypes, Component } from 'react'
import ReturnButton from './return_button'
import { initiateExport } from '../utils'

export default class GalleryExport extends Component {
  constructor (props) {
    super(props)
    this.state = {
      exportState: 'unintiated',
      submissionValid: true,
      errorDetails: null
    }
  }

  runExport (entry, projectId) {
    if (this.firstName.value && this.lastName.value && this.title.value) {
      initiateExport(entry, projectId, this)
    } else {
      this.setState({ submissionValid: false })
    }
  }

  renderUninitiated() {
    const {
      entry, projectId,
      firstName, lastName, title, description, license, showSource
    } = this.props
    return (
      <form onSubmit={() => this.runExport(entry, projectId)}>
        <p>
        The Overleaf Gallery is the easiest way to publish your work
        from Overleaf and make it searchable and shareable. Just fill
        out the details below.
        </p>
        <p>
          <div className="form-control-box">
            <label htmlFor="gallery-export-first-name">First name</label>
            <input
              id="gallery-export-first-name"
              type="text"
              className="form-control"
              defaultValue={firstName}
              maxLength="255"
              placeholder="First Name"
              ref={ (input) => (this.firstName = input)}
            />
          </div>
          <div className="form-control-box">
            <label htmlFor="gallery-export-last-name">Last name</label>
            <input
              id="gallery-export-last-name"
              type="text"
              className="form-control"
              defaultValue={lastName}
              maxLength="255"
              placeholder="Last Name"
              ref={ (input) => (this.lastName = input)}
            />
          </div>
          <div className="form-control-box">
            <label htmlFor="gallery-export-title">Title</label>
            <input
              id="gallery-export-title"
              type="text"
              className="form-control"
              defaultValue={title}
              maxLength="255"
              placeholder="Title"
              ref={ (input) => (this.title = input)}
            />
          </div>
          <div className="form-control-box">
            <label htmlFor="gallery-export-description">Description</label>
            <input
              id="gallery-export-description"
              type="text-area"
              className="form-control"
              defaultValue={description}
              maxLength="2048"
              placeholder="Description"
              ref={ (input) => (this.description = input)}
            />
          </div>
          <div className="form-control-box">
            <label htmlFor="gallery-export-license">License</label>
            <select id="gallery-export-license"
              ref={ (input) => (this.license = input)}>
              <option value='cc_by_4.0'>
                Creative Commons CC BY 4.0
              </option>
              <option value='lppl_1.3c'>
                LaTeX Project Public License 1.3c
              </option>
              <option value='other'>
                Other (as stated in the work)
              </option>
            </select>
          </div>
          <div className="form-control-box">
            <input type="checkbox"
              id="gallery-export-show-source"
              defaultValue={showSource}
              placeholder="Show source"
              ref={ (input) => (this.showSource = input)}
            />
            <label htmlFor="gallery-export-show-source">Show source</label>
          </div>
        </p>
        <br/>
        <submit className='btn btn-primary' >
          Submit to {entry.name}
        </submit>
        { !this.state.submissionValid &&
          <p style={{color: 'red'}}>
            Please provide first name, last name, and title before continuing
          </p>
        }
      </form>
    )
  }

  renderInitiated() {
    return (
      <span>
        <div style={{ fontSize: 20, margin: '20px 0px 20px' }}>
          <i className='fa fa-refresh fa-spin fa-fw'></i>
          <span> &nbsp; Exporting files, please wait...</span>
        </div>
      </span>
    )
  }

  renderComplete() {
    return (
      <span>
        <p>
          Export Successful!
        </p>
        <p>
          Thanks for submitting to {entry.name}. Your manuscript and
          supporting files have been sent directly to the journal's
          editorial team, and they will send a follow-up email with
          instructions for how to complete your submission.
        </p>
        <p>
          Please check your email for confirmation of your submission.
        </p>
      </span>
    )
  }

  renderError() {
    return (
      <span>
        <p>
          Export Failed
        </p>
        <p>
          Error message: {this.state.errorDetails}
        </p>
      </span>
    )
  }

  render() {
    const { entry, onReturn, projectId, returnText } = this.props

    let body
    if (this.state.exportState === 'unintiated') {
      body = this.renderUninitiated()
    } else if (this.state.exportState === 'initiated') {
      body = this.renderInitiated()
    } else if (this.state.exportState === 'complete') {
      body = this.renderComplete()
    } else {
      body = this.renderError()
    }

    return (
      <div
        className='publish-guide modal-body-content row content-as-table'
        key={entry.id}
      >
        <div className='col-sm-12'>
          <ReturnButton onReturn={onReturn} returnText={returnText}/>
          <h3 style={{marginTop: '5px'}}>
            Submit to: <br/>
            <strong> {entry.name} </strong>
          </h3>
          {body}
        </div>
      </div>
    )
  }
}

GalleryExport.propTypes = {
  entry: PropTypes.object.isRequired,
  returnText: PropTypes.string,
  onReturn: PropTypes.func,
  projectId: PropTypes.string.isRequired,
  hasFolders: PropTypes.bool,
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
  license: PropTypes.string,
  showSource: PropTypes.bool
}
