/* global $ */
import React, { PropTypes, Component } from 'react'
import SidebarWithReturnButton from './sidebar_with_return_button'

export default class GenericExport extends Component {
  constructor (props) {
    super(props)
    this.state = { exportState: 'unintiated' }
  }

  initiateExport (entry, projectId) {
    var link = `/project/${projectId}/export/${entry.id}`

    this.setState({ exportState: 'initiated' })
    $.ajax({
      url: link,
      type: 'POST',
      headers: {'X-CSRF-Token': window.csrfToken},
      success: (resp) => {
        this.setState({ exportState: 'complete' })
      },
      error: (resp) => {
        this.setState({ exportState: 'error' })
      }
    })
  }

  render () {
    const {entry, onReturn, projectId, returnText} = this.props
    return (
      <div
        className='publish-guide modal-body-content row content-as-table'
        key={entry.id}
      >
        <SidebarWithReturnButton onReturn={onReturn} returnText={returnText} />
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
                <button
                  className='btn'
                  onClick={() => this.initiateExport(entry, projectId)}
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
              </span>
            }
          </div>
        </div>
      </div>
    )
  }
}

GenericExport.propTypes = {
  entry: PropTypes.object.isRequired,
  returnText: PropTypes.string,
  onReturn: PropTypes.func,
  projectId: PropTypes.string.isRequired,
  onSwitch: PropTypes.func.isRequired
}
