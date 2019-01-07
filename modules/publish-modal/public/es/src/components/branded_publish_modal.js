/* global _ */

import React, { PropTypes, Component } from 'react'
import PublishGuide from './publish_guide'
import PublishSections from './publish_sections'

export default class BrandedPublishModal extends Component {
  render() {
    const { entries } = this.props
    const loopEntries = _.omit(entries, 'brand_data')
    return (
      <span>
        <div
          id="publish-table"
          className="modal-body-content row content-as-table"
        >
          <div className="col-md-12">
            <PublishGuide
              entry={entries.brand_data}
              projectId={this.props.initParams.projectId}
            />
            <br />
            <PublishSections
              entries={loopEntries}
              onSwitch={this.props.onSwitch}
            />
          </div>
        </div>
      </span>
    )
  }
}

BrandedPublishModal.propTypes = {
  entries: PropTypes.object.isRequired,
  onSwitch: PropTypes.func.isRequired,
  initParams: PropTypes.object.isRequired
}
