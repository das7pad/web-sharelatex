import React from 'react'
import PropTypes from 'prop-types'
import Icon from '../../../shared/components/icon'
import PreviewLogsPaneEntry from './preview-logs-pane-entry'
import t from '../../../misc/t'

function PreviewFirstErrorPopUp({
  logEntry,
  onGoToErrorLocation,
  onViewLogs,
  onClose
}) {
  function handleGoToErrorLocation() {
    const { file, line, column } = logEntry
    onGoToErrorLocation({ file, line, column })
  }

  return (
    <div
      className="first-error-popup"
      role="alertdialog"
      aria-label={t('first_error_popup_label')}
    >
      <PreviewLogsPaneEntry
        headerTitle={logEntry.message}
        rawContent={logEntry.content}
        formattedContent={logEntry.humanReadableHintComponent}
        extraInfoURL={logEntry.extraInfoURL}
        level={logEntry.level}
        showLineAndNoLink={false}
        showCloseButton
        customClass="log-entry-first-error-popup"
        onClose={onClose}
      />
      <div className="first-error-popup-actions">
        <button
          className="btn btn-info btn-xs first-error-btn"
          type="button"
          onClick={handleGoToErrorLocation}
        >
          <Icon type="chain" />
          &nbsp;
          {t('go_to_error_location')}
        </button>
        <button
          className="btn btn-info btn-xs first-error-btn"
          type="button"
          onClick={onViewLogs}
        >
          <Icon type="file-text-o" />
          &nbsp;
          {t('view_all_errors')}
        </button>
      </div>
    </div>
  )
}

PreviewFirstErrorPopUp.propTypes = {
  logEntry: PropTypes.object.isRequired,
  onGoToErrorLocation: PropTypes.func.isRequired,
  onViewLogs: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired
}

export default PreviewFirstErrorPopUp
