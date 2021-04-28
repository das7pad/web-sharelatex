import React from 'react'
import PropTypes from 'prop-types'
import PreviewLogsPaneEntry from './preview-logs-pane-entry'
import t from '../../../misc/t'

function PreviewValidationIssue({ name, details }) {
  let validationTitle
  let validationContent

  if (name === 'sizeCheck') {
    validationTitle = t('project_too_large')
    validationContent = (
      <>
        <div>{t('project_too_large_please_reduce')}</div>
        <ul className="list-no-margin-bottom">
          {details.resources.map((resource, index) => (
            <li key={index}>
              {resource.path} &mdash; {resource.kbSize}
              kb
            </li>
          ))}
        </ul>
      </>
    )
  } else if (name === 'conflictedPaths') {
    validationTitle = t('conflicting_paths_found')
    validationContent = (
      <>
        <div>{t('following_paths_conflict')}</div>
        <ul className="list-no-margin-bottom">
          {details.map((detail, index) => (
            <li key={index}>/{detail.path}</li>
          ))}
        </ul>
      </>
    )
  } else if (name === 'mainFile') {
    validationTitle = t('main_file_not_found')
    validationContent = <>{t('please_set_main_file')}</>
  }

  return validationTitle ? (
    <PreviewLogsPaneEntry
      headerTitle={validationTitle}
      formattedContent={validationContent}
      entryAriaLabel={t('validation_issue_entry_description')}
      level="error"
    />
  ) : null
}

PreviewValidationIssue.propTypes = {
  name: PropTypes.string.isRequired,
  details: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.array,
    PropTypes.bool,
  ]),
}

export default PreviewValidationIssue
