import React, { PropTypes, Component } from 'react'
import PublishSections from './publish_sections'

export default class BasicPublishModal extends Component {
  render() {
    const { entries } = this.props
    return (
      <span>
        <div
          id="publish-table"
          className="modal-body-content row content-as-table"
        >
          <div className="col-md-12">
            <PublishSections entries={entries} onSwitch={this.props.onSwitch} />
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
