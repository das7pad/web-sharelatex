import React, { PropTypes, Component } from 'react'
import ReturnButton from './return_button'
import { initiateExport2 } from '../utils'

export default class PublishGuide extends Component {
  constructor(props) {
    super(props)
    this.state = {
      exportState: 'uninitiated',
      errorDetails: null
    }
    this.initiateGuideExport = this.initiateGuideExport.bind(this)
  }

  initiateGuideExport(entry, projectId, type) {
    this.setState({ exportState: 'initiated' })
    initiateExport2(entry, projectId)
      .then(({ exportId }) => {
        // Trigger download of file in background, doesn't actually navigate
        // away
        this.props.downloadFile(
          `/project/${projectId}/export/${exportId}/${
            type === 'zip' ? 'zip' : 'pdf'
          }`
        )

        this.setState({ exportState: 'uninitiated' })
      })
      .catch(({ errorDetails }) => {
        this.setState({
          exportState: 'error',
          errorDetails
        })
      })
  }

  render() {
    const { entry, returnText, onReturn, projectId } = this.props

    return (
      <div
        className="publish-guide modal-body-content row content-as-table"
        id={'publish-guide-' + entry.id}
        key={entry.id}
      >
        <div className="col-sm-12">
          <ReturnButton onReturn={onReturn} returnText={returnText} />
          <GuideHtml
            entry={entry}
            projectId={projectId}
            exportState={this.state.exportState}
            initiateGuideExport={this.initiateGuideExport}
            errorDetails={this.state.errorDetails}
          />
          {entry.publish_link_destination && (
            <div>
              <Download
                entry={entry}
                projectId={projectId}
                exportState={this.state.exportState}
                initiateGuideExport={this.initiateGuideExport}
                errorDetails={this.state.errorDetails}
              />
              <Submit entry={entry} />
            </div>
          )}
        </div>
      </div>
    )
  }
}

export function GuideHtml({
  entry,
  projectId,
  exportState,
  initiateGuideExport,
  errorDetails
}) {
  const html = entry.publish_guide_html
  if (html.indexOf('DOWNLOAD') !== -1) {
    const htmlParts = html.split('DOWNLOAD')
    return (
      <div>
        <div dangerouslySetInnerHTML={{ __html: htmlParts[0] }} />
        <Download
          entry={entry}
          projectId={projectId}
          exportState={exportState}
          initiateGuideExport={initiateGuideExport}
          errorDetails={errorDetails}
        />
        <div
          style={{ marginLeft: '140px', paddingLeft: '15px' }}
          dangerouslySetInnerHTML={{ __html: htmlParts[1] }}
        />
      </div>
    )
  } else {
    return (
      <div dangerouslySetInnerHTML={{ __html: entry.publish_guide_html }} />
    )
  }
}

function Download({
  entry,
  projectId,
  exportState,
  initiateGuideExport,
  errorDetails
}) {
  return (
    <div style={{ marginLeft: '140px', paddingLeft: '15px' }}>
      {/* Most publish guides have an image column
           with 140px as the set width */}
      <p>
        <strong>Step 1: Download files</strong>
      </p>
      {exportState === 'uninitiated' && (
        <span>
          <p>
            <button
              className="btn btn-primary"
              onClick={() => initiateGuideExport(entry, projectId, 'zip')}
            >
              Download project ZIP with submission files (e.g. .bbl)
            </button>
          </p>
          <p>
            <button
              className="btn btn-primary"
              onClick={() => initiateGuideExport(entry, projectId, 'pdf')}
            >
              Download PDF file of your article
            </button>
          </p>
        </span>
      )}
      {exportState === 'initiated' && (
        <p style={{ fontSize: 20, margin: '20px 0px 20px' }}>
          <i className="fa fa-refresh fa-spin fa-fw" />
          <span> &nbsp; Compiling project, please wait...</span>
        </p>
      )}
      {exportState === 'error' && (
        <p>
          Project failed to compile
          <br />
          Error message: {errorDetails}
        </p>
      )}
    </div>
  )
}

function Submit({ entry }) {
  return (
    <div style={{ marginLeft: '140px', paddingLeft: '15px' }}>
      <p>
        <strong>Step 2: Submit your manuscript</strong>
      </p>
      <p>
        <a
          href={entry.publish_link_destination}
          target="_blank"
          rel="noopener"
          className="btn btn-primary"
          data-event="link_submit"
          data-category="Publish"
          data-action="submit"
          data-label={entry.id}
        >
          Submit to {entry.name}
        </a>
      </p>
    </div>
  )
}

function downloadFileWithLocation(url) {
  // Trigger download of file in background, doesn't actually navigate away
  window.location.pathname = url
}

PublishGuide.defaultProps = {
  // Note: provided as a prop, only because it can then be mocked in testing
  downloadFile: downloadFileWithLocation
}

PublishGuide.propTypes = {
  entry: PropTypes.object.isRequired,
  returnText: PropTypes.string,
  onReturn: PropTypes.func,
  projectId: PropTypes.string.isRequired,
  downloadFile: PropTypes.func.isRequired
}

GuideHtml.propTypes = {
  entry: PropTypes.object.isRequired,
  projectId: PropTypes.string.isRequired,
  exportState: PropTypes.string.isRequired,
  initiateGuideExport: PropTypes.func.isRequired,
  errorDetails: PropTypes.object
}

Download.propTypes = {
  entry: PropTypes.object.isRequired,
  projectId: PropTypes.string.isRequired,
  exportState: PropTypes.string.isRequired,
  initiateGuideExport: PropTypes.func.isRequired,
  errorDetails: PropTypes.object
}

Submit.propTypes = {
  entry: PropTypes.object.isRequired
}
