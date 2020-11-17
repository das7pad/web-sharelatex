import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import useExpandCollapse from '../../../shared/hooks/use-expand-collapse'
import Icon from '../../../shared/components/icon'
import t from '../../../misc/t'

function PreviewLogEntry({
  file,
  line,
  message,
  content,
  column,
  humanReadableHintComponent,
  extraInfoURL,
  level,
  showLineAndNoLink = true,
  showCloseButton = false,
  onLogEntryLocationClick,
  onClose
}) {
  function handleLogEntryLinkClick() {
    onLogEntryLocationClick({ file, line, column })
  }
  const logEntryDescription =
    level === 'raw'
      ? t('raw_logs_description')
      : t('log_entry_description', {
          level: level
        })
  return (
    <div className="log-entry" aria-label={logEntryDescription}>
      <PreviewLogEntryHeader
        level={level}
        file={file}
        line={line}
        message={message}
        showLineAndNoLink={showLineAndNoLink}
        onLogEntryLocationClick={handleLogEntryLinkClick}
        showCloseButton={showCloseButton}
        onClose={onClose}
      />
      {content ? (
        <PreviewLogEntryContent
          content={content}
          humanReadableHintComponent={humanReadableHintComponent}
          extraInfoURL={extraInfoURL}
        />
      ) : null}
    </div>
  )
}

function PreviewLogEntryHeader({
  level,
  file,
  line,
  message,
  showLineAndNoLink = true,
  showCloseButton = false,
  onLogEntryLocationClick,
  onClose
}) {
  const logEntryHeaderClasses = classNames('log-entry-header', {
    'log-entry-header-error': level === 'error',
    'log-entry-header-warning': level === 'warning',
    'log-entry-header-typesetting': level === 'typesetting',
    'log-entry-header-raw': level === 'raw'
  })
  const headerLogLocationTitle = t('navigate_log_source', {
    location: file + (line ? `, ${line}` : '')
  })

  return (
    <header className={logEntryHeaderClasses}>
      <h3 className="log-entry-header-title">{message}</h3>
      {showLineAndNoLink && file ? (
        <button
          className="btn-inline-link log-entry-header-link"
          type="button"
          title={headerLogLocationTitle}
          onClick={onLogEntryLocationClick}
        >
          <Icon type="chain" />
          &nbsp;
          <span>{file}</span>
          {line ? <span>, {line}</span> : null}
        </button>
      ) : null}
      {showCloseButton && file ? (
        <button
          className="btn-inline-link log-entry-header-link"
          type="button"
          aria-label={t('dismiss_error_popup')}
          onClick={onClose}
        >
          <span aria-hidden="true">&times;</span>
        </button>
      ) : null}
    </header>
  )
}

function PreviewLogEntryContent({
  content,
  humanReadableHintComponent,
  extraInfoURL
}) {
  const { isExpanded, expandableProps, toggleProps } = useExpandCollapse({
    collapsedSize: 150,
    classes: {
      container: 'log-entry-content-raw-expandable-container'
    }
  })
  const logContentClasses = classNames('log-entry-content-raw', {
    'log-entry-content-raw-collapsed': !isExpanded
  })
  const buttonContainerClasses = classNames(
    'log-entry-content-button-container',
    {
      'log-entry-content-button-container-collapsed': !isExpanded
    }
  )

  return (
    <div className="log-entry-content">
      <div {...expandableProps}>
        <pre className={logContentClasses}>{content.trim()}</pre>
        <div className={buttonContainerClasses}>
          <button
            type="button"
            className="btn btn-xs btn-default log-entry-btn-expand-collapse"
            {...toggleProps}
          >
            {isExpanded ? (
              <>
                <Icon type="angle-up" /> {t('collapse')}
              </>
            ) : (
              <>
                <Icon type="angle-down" /> {t('expand')}
              </>
            )}
          </button>
        </div>
      </div>
      {humanReadableHintComponent ? (
        <div className="log-entry-human-readable-hint">
          {humanReadableHintComponent}
        </div>
      ) : null}
      {extraInfoURL ? (
        <div className="log-entry-human-readable-hint-link">
          <a
            href={extraInfoURL}
            target="_blank"
            className="log-entry-human-readable-hint-link"
          >
            {t('log_hint_extra_info')}
          </a>
        </div>
      ) : null}
    </div>
  )
}

PreviewLogEntryHeader.propTypes = {
  level: PropTypes.string.isRequired,
  file: PropTypes.string,
  line: PropTypes.any,
  message: PropTypes.string,
  showLineAndNoLink: PropTypes.bool,
  showCloseButton: PropTypes.bool,
  onLogEntryLocationClick: PropTypes.func,
  onClose: PropTypes.func
}

PreviewLogEntryContent.propTypes = {
  content: PropTypes.string.isRequired,
  humanReadableHintComponent: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.element
  ]),
  extraInfoURL: PropTypes.string
}

PreviewLogEntry.propTypes = {
  file: PropTypes.string,
  // `line should be either a number or null (i.e. not required), but currently sometimes we get
  // an empty string (from BibTeX errors), which is why we're using `any` here. We should revert
  // to PropTypes.number (not required) once we fix that.
  line: PropTypes.any,
  column: PropTypes.any,
  message: PropTypes.string,
  content: PropTypes.string,
  humanReadableHintComponent: PropTypes.node,
  extraInfoURL: PropTypes.string,
  level: PropTypes.oneOf(['error', 'warning', 'typesetting', 'raw']).isRequired,
  showLineAndNoLink: PropTypes.bool,
  showCloseButton: PropTypes.bool,
  onLogEntryLocationClick: PropTypes.func,
  onClose: PropTypes.func
}

export default PreviewLogEntry
