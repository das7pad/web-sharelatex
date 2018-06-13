import React, { PropTypes, Component } from 'react'
import SidebarWithReturnButton from './sidebar_with_return_button'

export default class ExportGuide extends Component {
  render () {
    const {entry, onReturn, returnText, initParams} = this.props
    return (
      <div
        className='publish-guide modal-body-content row content-as-table'
        key={entry.id}
      >
        <SidebarWithReturnButton onReturn={onReturn} returnText={returnText} />
        <div className='col-sm-8'>
          <div className='row'>
            <div
              className='col-sm-2'
              style={{verticalAlign: 'top'}}
            >
              {entry.publish_menu_icon &&
                <img
                  src={entry.publish_menu_icon}
                  alt={entry.name}
                  style={{width: '106px', float: 'right'}}
                />
              }
            </div>
            <div className='col-sm-10' style={{paddingLeft: '15px'}}>
              <p
                dangerouslySetInnerHTML={{__html: entry.publish_menu_html}}
              />
              <Continue initParams={initParams} entry={entry} />
            </div>
          </div>
        </div>
      </div>
    )
  }
}

function Continue ({ initParams, entry }) {
  if (initParams.pdfUrl) {
    return (
      <div>
        <p>
          To begin a direct export from Overleaf please click the
          button below
        </p>
        <p>
          <button className="btn"
            style={{display: 'inline-block'}}
            onClick={() => this.props.onSwitch('export', entry.id)}>
            Continue
          </button>
        </p>
        <p>
          Please note that you'll have chance to confirm your
          submission on the next page before your files are sent
        </p>
      </div>
    )
  } else {
    return (
      <p>
        <strong>
          No current PDF. Please make sure your project
          compiles before exporting
        </strong>
      </p>
    )
  }
}

ExportGuide.propTypes = {
  entry: PropTypes.object.isRequired,
  returnText: PropTypes.string,
  onReturn: PropTypes.func,
  projectId: PropTypes.string.isRequired,
  onSwitch: PropTypes.func.isRequired,
  initParams: PropTypes.object.isRequired
}

Continue.propTypes = {
  entry: PropTypes.object.isRequired,
  initParams: PropTypes.object.isRequired
}
