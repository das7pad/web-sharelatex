/* global $ */
import React, { PropTypes, Component } from 'react'
import SidebarWithReturnButton from './sidebar_with_return_button'

export default class EmisExport extends Component {
  constructor (props) {
    super(props)
    this.state = {
      exportState: 'unintiated',
      submissionValid: true,
      errorDetails: null
    }
  }

  initiateExport (entry, projectId) {
    var link = `/project/${projectId}/export/${entry.id}`

    if (this.firstName.value && this.lastName.value) {
      this.setState({ exportState: 'initiated' })
      $.ajax({
        url: link,
        type: 'POST',
        data: {firstName: this.firstName.value, lastName: this.lastName.value},
        headers: {'X-CSRF-Token': window.csrfToken},
        success: (resp) => {
          this.pollExportStatus(
            resp.export_v1_id,
            projectId,
            this.pollExportStatus
          )
        },
        error: (resp) => {
          this.setState({ exportState: 'error' })
        }
      })
    } else {
      this.setState({ submissionValid: false })
    }
  }

  pollExportStatus (exportId, projectId, recursion) {
    var link = `/project/${projectId}/export/${exportId}`

    $.ajax({
      url: link,
      type: 'GET',
      success: (resp) => {
        const status = resp.export_json
        if (status.status_summary === 'failed') {
          this.setState({
            exportState: 'error',
            errorDetails: status.status_detail
          })
        } else if (status.status_summary === 'succeeded') {
          this.setState({ exportState: 'complete' })
        } else {
          setTimeout(function () {
            recursion(exportId, projectId, recursion)
          }, 10000)
        }
      },
      error: (resp) => {
        this.setState({ exportState: 'error' })
      }
    })
  }

  render () {
    const {entry, onReturn, projectId, returnText, hasFolders, firstName, lastName} = this.props
    if (hasFolders) {
      return (
        <div
          className='publish-guide modal-body-content row content-as-table'
          key={entry.id} >
          <SidebarWithReturnButton onReturn={onReturn} returnText={returnText}/>
          <div className='col-sm-8'>
            <div className='row'>
              <h3 style={{marginTop: '5px'}}>
                Submit to: <br/>
                <strong> {entry.name} </strong>
              </h3>
              <p>
                <strong> Files must be at top folder level </strong>
              </p>
              <p>
                This project has one or more files in subfolders,
                rather than at the top folder level. Although Overleaf
                allows you to create and nest folders within your project,
                {entry.name} requires all files to be at the top level
                of your project.
              </p>
              <p>
                Please move each of the above files to the top level of the
                project, check that your project renders properly, and then
                retry the submission. We apologize for the inconvenience.
              </p>
            </div>
          </div>
        </div>
      )
    } else {
      return (
        <div
          className='publish-guide modal-body-content row content-as-table'
          key={entry.id}
        >
          <SidebarWithReturnButton onReturn={onReturn} returnText={returnText}/>
          <div className='col-sm-8'>
            <div className='row'>
              <h3 style={{marginTop: '5px'}}>
                Submit to: <br/>
                <strong> {entry.name} </strong>
              </h3>
              { this.state.exportState === 'unintiated' &&
                <span>
                  <p>
                    Thanks for using Overleaf to submit your article.
                  </p>
                  <p>
                    When you submit using the button below, your manuscript and
                    supporting files will be sent to the journal automatically,
                    and you will receive a confirmation email from Overleaf.
                    The journal's editorial team will then send you a follow-up
                    email with instructions for how to complete your submission.
                  </p>
                  <p>
                    To send your article,
                    please confirm your first and last name:
                  </p>
                  <p>
                    <input type="text"
                      className="form-control"
                      defaultValue={firstName}
                      style={{ width: '30%', display: 'inline-block' }}
                      maxLength="255"
                      placeholder="First Name"
                      ref={ (input) => (this.firstName = input)}
                    />
                    <input type="text"
                      className="form-control"
                      defaultValue={lastName}
                      style={{ width: '30%', display: 'inline-block' }}
                      maxLength="255"
                      placeholder="Last Name"
                      ref={ (input) => (this.lastName = input)}
                    />
                  </p>
                  <br/>
                  <button
                    className='btn'
                    onClick={() => this.initiateExport(entry, projectId)}
                  >
                    Submit to {entry.name}
                  </button>
                  { !this.state.submissionValid &&
                    <p style={{color: 'red'}}>
                      Please add valid first and last names before continuing
                    </p>
                  }
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
        </div>
      )
    }
  }
}

EmisExport.propTypes = {
  entry: PropTypes.object.isRequired,
  returnText: PropTypes.string,
  onReturn: PropTypes.func,
  projectId: PropTypes.string.isRequired,
  onSwitch: PropTypes.func.isRequired,
  hasFolders: PropTypes.bool,
  firstName: PropTypes.string,
  lastName: PropTypes.string
}
