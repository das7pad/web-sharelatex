import React, { PropTypes, Component } from 'react'
import PublishGuide from './publish_guide'
import ExportGuide from './export_guide'
import { findEntryInCategories } from '../utils.js'

export default class GuidePublishModal extends Component {
  render () {
    const {
      guideId,
      initialEntry,
      entries,
      onSwitch,
      shown,
      docKey
    } = this.props

    var entry, onReturn, returnText
    if (initialEntry &&
        guideId === initialEntry.id) {
      entry = initialEntry
      if (entries.journal && entries.journal.entries.length > 1 && entries.brand_data.active) {
        returnText = 'More ' + entries.brand_data.name + ' Journals'
        onReturn = onSwitch
      }
    } else {
      entry = findEntryInCategories(entries, guideId)
      returnText = 'Back to Journals and Services'
      onReturn = onSwitch
    }
    if (shown === 'guide') {
      return (<PublishGuide
        onReturn={onReturn}
        entry={entry}
        returnText={returnText}
        />)
    } else {
      return (<ExportGuide
        onReturn={onReturn}
        entry={entry}
        returnText={returnText}
        docKey={docKey}
        />)
    }
  }
}

GuidePublishModal.propTypes = {
  entries: PropTypes.object.isRequired,
  initialEntry: PropTypes.object,
  guideId: PropTypes.number.isRequired,
  docKey: PropTypes.string.isRequired,
  shown: PropTypes.string.isRequired,
  onSwitch: PropTypes.func.isRequired
}
