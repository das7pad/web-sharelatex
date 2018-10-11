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

  runExport (ev) {
    ev.preventDefault()
    let valid = this.firstName.value &&
      this.lastName.value &&
      this.description.value &&
      this.title.value;
    if (valid) {
      const { entry, projectId } = this.props
      initiateExport(entry, projectId, this)
    }
    this.setState({ submissionValid: valid })
    return(valid)
  }

  renderUninitiated() {
    const {
      entry, projectId,
      firstName, lastName, title, description, license, showSource
    } = this.props
    return (
      <form onSubmit={ (ev) => this.runExport(ev) }>
        <p>
        The Overleaf Gallery is the easiest way to publish your work
        from Overleaf and make it searchable and shareable. Just fill
        out the details below.
        </p>
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
          <textarea
            id="gallery-export-description"
            rows="2"
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
            defaultChecked={showSource}
            placeholder="Show source"
            ref={ (input) => (this.showSource = input)}
          />
          <label htmlFor="gallery-export-show-source">Show source</label>
        </div>
        <input type="submit" className='btn btn-primary'
          value={"Submit to " + entry.name}/>
        { !this.state.submissionValid &&
          <p style={{color: 'red'}}>
            Please provide all of first name, last name, title,
            and description before continuing
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
    const entry = this.props.entry
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
