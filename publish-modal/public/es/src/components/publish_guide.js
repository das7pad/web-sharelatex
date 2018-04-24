import React, { PropTypes, Component } from 'react'
import SidebarWithReturnButton from './sidebar_with_return_button'

export default class PublishGuide extends Component {
  componentDidMount () {
    // Hack to fix links in DB that contain target="_blank" security hole
    // WL.fixOpenerLinks()
  }

  render () {
    const { entry, returnText, onReturn, projectId, pdfUrl } = this.props
    return (
      <div
        className='publish-guide modal-body-content row content-as-table'
        id={'publish-guide-' + entry.id}
        key={entry.id}
      >
        <SidebarWithReturnButton onReturn={onReturn} returnText={returnText} />
        <div className='col-sm-8'>
          <div dangerouslySetInnerHTML={{ __html: entry.publish_guide_html }} />
          {entry.publish_link_destination &&
          <DownloadAndSubmit entry={entry} projectId={projectId} pdfUrl={pdfUrl} />}
        </div>
      </div>
    )
  }
}

function DownloadAndSubmit ({ entry, projectId, pdfUrl }) {
  return (
    <div style={{ marginLeft: '140px', paddingLeft: '15px' }}>
      { /* Most publish guides have an image column
           with 140px as the set width */ }
      <p><strong>Step 1: Download files</strong></p>
      <p>
        <a
          href={'/project/' + projectId + '/download/zip'}
          target="_blank"
        >
          Download ZIP file with all the source files
        </a>
      </p>
      <p>
        {pdfUrl && <a
          href={pdfUrl}
          target="_blank"
                  >
          Download PDF file of your article
        </a>}
        {!pdfUrl && <div class="link-disabled">
          Download PDF file of your article ( please compile your project before downloading PDF )
        </div>}
      </p>
      <p><strong>Step 2: Submit your manuscript</strong></p>
      <p>
        <a
          href={entry.publish_link_destination}
          target='_blank'
          className='link-as-button'
          data-event='link_submit'
          data-category='Publish'
          data-action='submit'
          data-label={entry.id}
        >
          Submit to {entry.name}
        </a>
      </p>
    </div>
  )
}


PublishGuide.propTypes = {
  entry: PropTypes.object.isRequired,
  returnText: PropTypes.string,
  onReturn: PropTypes.func,
  projectId: PropTypes.string.isRequired,
  pdfUrl: PropTypes.string
}

DownloadAndSubmit.propTypes = {
  entry: PropTypes.object.isRequired,
  projectId: PropTypes.string.isRequired,
  pdfUrl: PropTypes.string
}
