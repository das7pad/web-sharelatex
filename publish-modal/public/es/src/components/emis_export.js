/* global $ */
import React, { PropTypes, Component } from 'react'
import SidebarWithReturnButton from './sidebar_with_return_button'

export default class EmisExport extends Component {
  constructor (props) {
    super(props)
    this.state = {
      exportState: 'unintiated',
      firstName: this.props.firstName,
      lastName: this.props.lastName,
      submissionValid: true
    }
    this.handleChange = this.handleChange.bind(this)
  }

  initiateExport (entry, projectId) {
    var link = `/project/${projectId}/export/${entry.id}`

    if (this.state.firstName && this.state.lastName) {
      this.setState({ exportState: 'initiated' })
      $.ajax({
        url: link,
        type: 'POST',
        data: {firstName: this.state.firstName, lastName: this.state.lastName},
        headers: {'X-CSRF-Token': window.csrfToken},
        success: (resp) => {
          this.setState({ exportState: 'complete' })
        },
        error: (resp) => {
          this.setState({ exportState: 'error' })
        }
      })
    } else {
      this.setState({ submissionValid: false })
    }
  }

  handleChange (event) {
    this.setState({ [event.target.name]: event.target.value })
  }

  render () {
    const {entry, onReturn, projectId, returnText, hasFolders} = this.props
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
                This project has one or more files in subfolders, rather than at the top folder level. Although Overleaf allows you to create and nest folders within your project, {entry.name} requires all files to be at the top level of your project.
              </p>
              <p>
                Please move each of the above files to the top level of the project, check that your project renders properly, and then retry the submission. We apologize for the inconvenience.
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
                      name="firstName"
                      style={{ width: '30%', display: 'inline-block' }}
                      value={this.state.firstName}
                      maxLength="255"
                      placeholder="First Name"
                      onChange={this.handleChange} />
                    <input type="text"
                      className="form-control"
                      name="lastName"
                      style={{ width: '30%', display: 'inline-block' }}
                      value={this.state.lastName}
                      maxLength="255"
                      placeholder="Last Name"
                      onChange={this.handleChange} />
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
