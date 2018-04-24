import React, { PropTypes, Component } from 'react'
import SidebarWithReturnButton from './sidebar_with_return_button'

export default class ExportGuide extends Component {
  componentDidMount () {
    // Hack to fix links in DB that contain target="_blank" security hole
    //WL.fixOpenerLinks()
  }

  render () {
    const {entry, onReturn, projectId, returnText} = this.props
    var link
    var multiJournalPartners = ['scholar_one', 'aries', 'ejp']
    if (multiJournalPartners.indexOf(entry.partner) >= 0) {
      link = `/docs/${projectId}/exports/journal/${entry.id}`
    } else {
      link = `/docs/${projectId}/exports/${entry.partner}`
    }
    return (
      <div
        className='publish-guide modal-body-content row content-as-table'
        style={{paddingTop: '20px'}}
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
              <p>
                To begin a direct export from Overleaf please click the
                button below
              </p>
              <p>
                <a className='link-as-button doc-event'
                  style={{display: 'inline-block'}}
                  href={link}
                  data-event='direct_submit'
                  data-category='Publish'
                  data-action='submit'
                  data-label={entry.id}>
                    Submit Now
                </a>
              </p>
              <p>
                Please note that you'll have chance to confirm your
                submission on the next page before your files are sent
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

ExportGuide.propTypes = {
  entry: PropTypes.object.isRequired,
  returnText: PropTypes.string,
  onReturn: PropTypes.func,
  projectId: PropTypes.string.isRequired
}
