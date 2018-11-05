/* global _ */
import React, { PropTypes, Component } from 'react'
import PublishMenuEntry from './publish_menu_entry'

export default class PublishMenuRow extends Component {
  /* provide correct props including links for an entry */
  render() {
    const { right, left, onSwitch, displayCategory } = this.props
    return (
      <div>
        {this.props.left && (
          <PublishMenuEntry
            {...generateEntry(left, onSwitch, displayCategory)}
          />
        )}
        {this.props.right && (
          <PublishMenuEntry
            {...generateEntry(right, onSwitch, displayCategory)}
          />
        )}
      </div>
    )
  }
}
function generateEntry(entry, onSwitch, displayCategory) {
  // generate link
  var switchTo, linkClass

  if (entry.partner) {
    switchTo = 'exportGuide'
  } else {
    switchTo = 'guide'
  }
  return _.extend({}, entry, {
    switchTo: switchTo,
    linkClass: linkClass,
    onSwitch: onSwitch,
    displayCategory: displayCategory
  })
}

PublishMenuRow.propTypes = {
  left: PropTypes.object,
  right: PropTypes.object,
  onSwitch: PropTypes.func.isRequired,
  displayCategory: PropTypes.bool
}
