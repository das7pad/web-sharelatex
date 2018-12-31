import React, { PropTypes, Component } from 'react'
import ReturnButton from './return_button'

export default class ExportGuide extends Component {
  render() {
    const { entry, onReturn, returnText, initParams, onSwitch } = this.props
    return (
      <div
        className="publish-guide modal-body-content row content-as-table"
        key={entry.id}
      >
        <div className="col-sm-12">
          <ReturnButton onReturn={onReturn} returnText={returnText} />
        </div>
        <div className="col-sm-2" style={{ verticalAlign: 'top' }}>
          {entry.publish_menu_icon && (
            <img
              src={entry.publish_menu_icon}
              alt={entry.name}
              style={{ width: '106px', float: 'right' }}
            />
          )}
        </div>
        <div className="col-sm-10" style={{ paddingLeft: '15px' }}>
          <p dangerouslySetInnerHTML={{ __html: entry.publish_menu_html }} />
          <Continue {...initParams} entry={entry} onSwitch={onSwitch} />
        </div>
      </div>
    )
  }
}

function Continue({ entry, onSwitch, pdfUrl, logs }) {
  if (pdfUrl) {
    if (logs.errors.length === 0) {
      return (
        <div>
          <p>
            To begin a direct export from Overleaf please click the button below
          </p>
          <p>
            <button
              className="btn btn-primary"
              style={{ display: 'inline-block' }}
              onClick={() => onSwitch('export', entry.id)}
            >
              Continue
            </button>
          </p>
          <p>
            Please note that you'll have chance to confirm your submission on
            the next page before your files are sent
          </p>
          {logs.warnings.length > 0 && (
            <p>
              <strong> Warning: </strong> LaTeX warnings on this project may
              affect submissions. Please check the logs before continuing
            </p>
          )}
        </div>
      )
    } else {
      return (
        <p>
          <strong>
            LaTeX errors on this project affect submission. Please check the
            logs before continuing
          </strong>
        </p>
      )
    }
  } else {
    return (
      <p>
        <strong>
          No current PDF. Please make sure your project compiles before
          exporting
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
  logs: PropTypes.object,
  pdfUrl: PropTypes.string
}
