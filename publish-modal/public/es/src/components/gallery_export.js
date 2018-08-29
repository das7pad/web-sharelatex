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
    if (this.firstName.value && this.lastName.value) {
      initiateExport(entry, projectId, this)
    } else {
      this.setState({ submissionValid: false })
    }
  }

  render () {
    const {
      entry, onReturn, projectId, returnText, hasFolders,
      firstName, lastName, title, description, license, showSource
    } = this.props
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
          { this.state.exportState === 'unintiated' &&
            <span>
              <p>
              The Overleaf Gallery is the easiest way to publish your work
              from Overleaf and make it searchable and shareable. Just fill
              out the details below.
              </p>
              <p>
                <input type="text"
                  className="form-control"
                  defaultValue={firstName}
                  maxLength="255"
                  placeholder="First Name"
                  ref={ (input) => (this.firstName = input)}
                />
                <input type="text"
                  className="form-control"
                  defaultValue={lastName}
                  maxLength="255"
                  placeholder="Last Name"
                  ref={ (input) => (this.lastName = input)}
                />
                <input type="text"
                  className="form-control"
                  defaultValue={title}
                  maxLength="255"
                  placeholder="Title"
                  ref={ (input) => (this.title = input)}
                />
                <input type="text-area"
                  className="form-control"
                  defaultValue={description}
                  maxLength="2048"
                  placeholder="Description"
                  ref={ (input) => (this.description = input)}
                />
                <input type="text"
                  className="form-control"
                  defaultValue={license}
                  maxLength="2048"
                  placeholder="License"
                  ref={ (input) => (this.license = input)}
                />
                <input type="text"
                  className="form-control"
                  defaultValue={showSource}
                  maxLength="4"
                  placeholder="Show source"
                  ref={ (input) => (this.showSource = input)}
                />
              </p>
              <br/>
              <button
                className='btn btn-primary'
                  onClick={() => this.runExport(entry, projectId)}
              >
                Submit to {entry.name}
              </button>
            </span>
          }
          { this.state.exportState === 'initiated' &&
            <span>
              <div style={{ fontSize: 20, margin: '20px 0px 20px' }}>
                <i className='fa fa-refresh fa-spin fa-fw'></i>
                <span> &nbsp; Exporting files, please wait...</span>
              </div>
            </span>
          }
          {
            this.state.exportState === 'complete' &&
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
          }
          {
            this.state.exportState === 'error' &&
            <span>
              <p>
                Export Failed
              </p>
              <p>
                Error message: {this.state.errorDetails}
              </p>
            </span>
          }
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
  onSwitch: PropTypes.func.isRequired,
  hasFolders: PropTypes.bool,
  firstName: PropTypes.string,
  lastName: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
  license: PropTypes.string,
  showSource: PropTypes.bool
}
