import React, { PropTypes, Component } from 'react'
import SidebarWithReturnButton from './sidebar_with_return_button'

export default class PublishGuide extends Component {
  componentDidMount () {
    // Hack to fix links in DB that contain target="_blank" security hole
    // WL.fixOpenerLinks()
  }

  render () {
    const { entry, returnText, onReturn } = this.props
    return (
      <div
        className='publish-guide modal-body-content row content-as-table'
        id={'publish-guide-' + entry.id}
        style={{ paddingTop: '20px' }}
        key={entry.id}
      >
        <SidebarWithReturnButton onReturn={onReturn} returnText={returnText} />
        <div className='col-sm-8'>
          <div dangerouslySetInnerHTML={{ __html: entry.publish_guide_html }} />
          {entry.publish_link_destination &&
            <DownloadAndSubmit entry={entry} />}
        </div>
      </div>
    )
  }
}

function DownloadAndSubmit ({ entry }) {
  return (
    <div style={{ marginLeft: '140px', paddingLeft: '15px' }}>
      { /* Most publish guides have an image column with 140px as the set width */ }
      <p><strong>Step 1: Download files</strong></p>
      <p>
        { /* the download-zip-with-intermediates and download-pdf classes
             are listened for by wl-exports triggering file downloads */ }
        <button
          className='button-as-link download-zip-with-intermediates tracked_link doc-event'
          data-category='Publish'
          data-event='publish_zip'
          data-action='zip'
          data-label={entry.id}
        >
          Download ZIP file with all the source files
        </button>
      </p>
      <p>
        <button
          className='button-as-link download-pdf tracked_link doc-event'
          data-category='Publish'
          data-event='publish_pdf'
          data-action='pdf'
          data-label={entry.id}
        >
          Download PDF file of your article
        </button>
      </p>
      <p><strong>Step 2: Submit your manuscript</strong></p>
      <p>
        <a
          href={entry.publish_link_destination}
          target='_blank'
          className='link-as-button display-inline-block tracked_link doc-event'
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
  onReturn: PropTypes.func
}

DownloadAndSubmit.propTypes = {
  entry: PropTypes.object.isRequired
}
