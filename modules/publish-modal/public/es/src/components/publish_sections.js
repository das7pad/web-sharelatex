/* global _ */
import React, { PropTypes } from 'react'
import PublishMenuSearch from './publish_menu_search'
import PublishMenuGrid from './publish_menu_grid'

const PublishSections = ({ entries, onSwitch }) => (
  <div>
    {_.map(entries, (category, key) => (
      <div key={'category-' + key}>
        <span
          className="affix-target affix-content-title"
          data-affix-target={key}
        >
          {category.title}
        </span>
        <div className="affix-subcontent">
          {section(category, key, entries, onSwitch)}
        </div>
      </div>
    ))}
  </div>
)

function section(category, key, entries, onSwitch) {
  if (key === 'search') {
    return (
      <PublishMenuSearch
        entries={entries}
        key={'journal-search-' + key}
        onSwitch={onSwitch}
      />
    )
  } else {
    return (
      <PublishMenuGrid
        entries={category.entries}
        key={'publish-menu-' + key}
        onSwitch={onSwitch}
      />
    )
  }
}

PublishSections.propTypes = {
  entries: PropTypes.object.isRequired,
  onSwitch: PropTypes.func.isRequired
}

export default PublishSections
