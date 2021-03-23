import React from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import Icon from '../../../shared/components/icon'
import t from '../../../misc/t'

const MAX_ERRORS_COUNT = 99

function PreviewLogsToggleButton({
  onToggle,
  showLogs,
  autoCompileLintingError = false,
  compileFailed = false,
  logsState: { nErrors, nWarnings },
  showText
}) {
  let textStyle = {}
  let btnColorCssClass = 'btn-default'
  let buttonContents

  if (!showText) {
    textStyle = {
      position: 'absolute',
      right: '-100vw'
    }
  }

  function handleOnClick(e) {
    e.currentTarget.blur()
    onToggle()
  }

  if (showLogs) {
    buttonContents = <ViewPdf textStyle={textStyle} />
  } else {
    buttonContents = (
      <CompilationResult
        textStyle={textStyle}
        autoCompileLintingError={autoCompileLintingError}
        nErrors={nErrors}
        nWarnings={nWarnings}
      />
    )
    if (autoCompileLintingError || nErrors > 0) {
      btnColorCssClass = 'btn-danger'
    } else if (nWarnings > 0) {
      btnColorCssClass = 'btn-warning'
    }
  }
  const buttonClasses = classNames(
    'btn',
    'btn-xs',
    'btn-toggle-logs',
    'toolbar-item',
    btnColorCssClass
  )

  const buttonElement = (
    <button
      id="logs-toggle"
      type="button"
      disabled={compileFailed}
      className={buttonClasses}
      onClick={handleOnClick}
    >
      {buttonContents}
    </button>
  )

  return showText ? (
    buttonElement
  ) : (
    <OverlayTrigger
      placement="bottom"
      overlay={
        <Tooltip id="tooltip-logs-toggle">
          {showLogs ? t('view_pdf') : t('view_logs')}
        </Tooltip>
      }
    >
      {buttonElement}
    </OverlayTrigger>
  )
}

function CompilationResult({
  textStyle,
  autoCompileLintingError,
  nErrors,
  nWarnings
}) {
  if (autoCompileLintingError) {
    return <AutoCompileLintingError textStyle={textStyle} />
  } else if (nErrors || nWarnings) {
    return (
      <LogsCompilationResult
        logType={nErrors ? 'errors' : 'warnings'}
        nLogs={nErrors || nWarnings}
        textStyle={textStyle}
      />
    )
  } else {
    return <ViewLogs textStyle={textStyle} />
  }
}

function ViewPdf({ textStyle }) {
  return (
    <>
      <Icon type="file-pdf-o" />
      <span className="toolbar-text" style={textStyle}>
        {t('view_pdf')}
      </span>
    </>
  )
}

function LogsCompilationResult({ textStyle, logType, nLogs }) {
  const label =
    logType === 'errors' ? t('your_project_has_errors') : t('view_warnings')
  return (
    <>
      <Icon type="file-text-o" />
      <span
        className="btn-toggle-logs-label toolbar-text"
        aria-label={label}
        style={textStyle}
      >
        {`${label} (${
          nLogs > MAX_ERRORS_COUNT ? `${MAX_ERRORS_COUNT}+` : nLogs
        })`}
      </span>
    </>
  )
}

function AutoCompileLintingError({ textStyle }) {
  return (
    <>
      <Icon type="exclamation-triangle" />
      <span className="toolbar-text" style={textStyle}>
        {t('code_check_failed')}
      </span>
    </>
  )
}

function ViewLogs({ textStyle }) {
  return (
    <>
      <Icon type="file-text-o" />
      <span className="toolbar-text" style={textStyle}>
        {t('view_logs')}
      </span>
    </>
  )
}

PreviewLogsToggleButton.propTypes = {
  onToggle: PropTypes.func.isRequired,
  logsState: PropTypes.shape({
    nErrors: PropTypes.number.isRequired,
    nWarnings: PropTypes.number.isRequired
  }),
  showLogs: PropTypes.bool.isRequired,
  showText: PropTypes.bool.isRequired,
  compileFailed: PropTypes.bool,
  autoCompileLintingError: PropTypes.bool
}

CompilationResult.propTypes = {
  textStyle: PropTypes.object.isRequired,
  autoCompileLintingError: PropTypes.bool,
  nErrors: PropTypes.number.isRequired,
  nWarnings: PropTypes.number.isRequired
}

LogsCompilationResult.propTypes = {
  logType: PropTypes.string.isRequired,
  nLogs: PropTypes.number.isRequired,
  textStyle: PropTypes.object.isRequired
}

AutoCompileLintingError.propTypes = {
  textStyle: PropTypes.object.isRequired
}

ViewLogs.propTypes = {
  textStyle: PropTypes.object.isRequired
}

ViewPdf.propTypes = {
  textStyle: PropTypes.object.isRequired
}

export default PreviewLogsToggleButton
