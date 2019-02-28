import React, { PropTypes, Component } from 'react'
import PublishGuide from './publish_guide'
import ExportGuide from './export_guide'
import EJPExport from './ejp_export'
import EmisExport from './emis_export'
import GalleryExport from './gallery_export'
import ScholarOneExport from './scholar_one_export'
import F1000Export from './f1000_export'
import { findEntryInCategories } from '../utils.js'

export default class GuidePublishModal extends Component {
  render() {
    const {
      guideId,
      initialEntry,
      entries,
      onSwitch,
      shown,
      initParams
    } = this.props

    var entry, onReturn, returnText
    if (initialEntry && guideId === initialEntry.id) {
      entry = initialEntry
      if (
        entries.journal &&
        entries.journal.entries.length > 1 &&
        entries.brand_data.active
      ) {
        returnText = 'More ' + entries.brand_data.name + ' Journals'
        onReturn = onSwitch
      }
    } else {
      entry = findEntryInCategories(entries, guideId)
      returnText = 'Back to Journals and Services'
      onReturn = onSwitch
    }
    if (shown === 'guide') {
      return (
        <PublishGuide
          onReturn={onReturn}
          entry={entry}
          returnText={returnText}
          projectId={initParams.projectId}
        />
      )
    } else if (shown === 'export') {
      if (entry.partner === 'gallery') {
        return (
          <GalleryExport
            onReturn={onReturn}
            entry={entry}
            returnText={returnText}
            projectId={initParams.projectId}
            firstName={initParams.firstName}
            lastName={initParams.lastName}
            title={initParams.title}
            author={initParams.author}
            description={initParams.description}
            license={initParams.license}
            showSource={initParams.showSource}
            hasFolders={initParams.hasFolders}
          />
        )
      } else if (entry.partner === 'scholar_one') {
        return (
          <ScholarOneExport
            onReturn={onReturn}
            entry={entry}
            returnText={returnText}
            projectId={initParams.projectId}
          />
        )
      } else if (
        entry.partner === 'f1000' ||
        entry.partner === 'wellcome_trust'
      ) {
        return (
          <F1000Export
            onReturn={onReturn}
            entry={entry}
            partnerName={entry.name}
            partnerContactURL={entry.home_url + '/contact'} // works; not ideal
            returnText={returnText}
            projectId={initParams.projectId}
          />
        )
      } else if (entry.partner === 'ejp') {
        return (
          <EJPExport
            onReturn={onReturn}
            entry={entry}
            returnText={returnText}
            projectId={initParams.projectId}
            firstName={initParams.firstName}
            lastName={initParams.lastName}
          />
        )
      } else {
        return (
          <EmisExport
            onReturn={onReturn}
            entry={entry}
            returnText={returnText}
            projectId={initParams.projectId}
            firstName={initParams.firstName}
            lastName={initParams.lastName}
            hasFolders={initParams.hasFolders}
          />
        )
      }
    } else if (shown === 'exportGuide') {
      return (
        <ExportGuide
          onReturn={onReturn}
          entry={entry}
          returnText={returnText}
          projectId={initParams.projectId}
          onSwitch={onSwitch}
          initParams={initParams}
        />
      )
    } else {
      return null
    }
  }
}

GuidePublishModal.propTypes = {
  entries: PropTypes.object.isRequired,
  initialEntry: PropTypes.object,
  guideId: PropTypes.number.isRequired,
  shown: PropTypes.string.isRequired,
  onSwitch: PropTypes.func.isRequired,
  initParams: PropTypes.object.isRequired
}
