import React, { PropTypes, Component } from 'react'
// import $ from 'jquery'
import PublishAffix from './publish_affix'
import PublishSections from './publish_sections'

export default class BasicPublishModal extends Component {
  componentDidMount () {
    // $('#publish-modal').trigger('activate-affix-modal')
  }

  render () {
    const { entries } = this.props
    return (
      <span>
        <div
          id='publish-table'
          className='modal-body-content row content-as-table'>
          <PublishAffix categories={entries} />
          <div className='col-md-9 col-affixed'>
            <PublishSections entries={entries}
              onSwitch={this.props.onSwitch} />
          </div>
        </div>
      </span>
    )
  }
}

BasicPublishModal.propTypes = {
  entries: PropTypes.object.isRequired,
  onSwitch: PropTypes.func.isRequired
}
