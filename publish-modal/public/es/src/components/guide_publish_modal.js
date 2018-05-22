import React, { PropTypes, Component } from 'react'
import PublishGuide from './publish_guide'
import ExportGuide from './export_guide'
import GenericExport from './generic_export'
import { findEntryInCategories } from '../utils.js'

export default class GuidePublishModal extends Component {
  render () {
    const {
      guideId,
      initialEntry,
      entries,
      onSwitch,
      shown,
      projectId,
      pdfUrl
    } = this.props

    var entry, onReturn, returnText
    if (initialEntry &&
        guideId === initialEntry.id) {
      entry = initialEntry
      if (entries.journal && entries.journal.entries.length > 1 &&
          entries.brand_data.active) {
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
        projectId={projectId}
        pdfUrl={pdfUrl}
      />)
    } else if (shown === 'export') {
      return (<GenericExport
        onReturn={onReturn}
        entry={entry}
        returnText={returnText}
        projectId={projectId}
        onSwitch={onSwitch}
      />)
    } else if (shown === 'exportGuide') {
      return (<ExportGuide
        onReturn={onReturn}
        entry={entry}
        returnText={returnText}
        projectId={projectId}
        onSwitch={onSwitch}
      />)
    } else {
      return null
    }
  }
}

GuidePublishModal.propTypes = {
  entries: PropTypes.object.isRequired,
  initialEntry: PropTypes.object,
  guideId: PropTypes.number.isRequired,
  projectId: PropTypes.string.isRequired,
  shown: PropTypes.string.isRequired,
  onSwitch: PropTypes.func.isRequired,
  pdfUrl: PropTypes.string
}
