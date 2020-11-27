import React, { useState } from 'react'
import PropTypes from 'prop-types'
import PreviewToolbar from './preview-toolbar'
import PreviewLogsPane from './preview-logs-pane'
import PreviewFirstErrorPopUp from './preview-first-error-pop-up'
import t from '../../../misc/t'

function PreviewPane({
  compilerState,
  onClearCache,
  onRecompile,
  onRunSyntaxCheckNow,
  onSetAutoCompile,
  onSetDraftMode,
  onSetSyntaxCheck,
  onToggleLogs,
  outputFiles,
  pdfDownloadUrl,
  onLogEntryLocationClick,
  showLogs
}) {
  const [lastCompileTimestamp, setLastCompileTimestamp] = useState(
    compilerState.lastCompileTimestamp
  )
  const [seenLogsForCurrentCompile, setSeenLogsForCurrentCompile] = useState(
    false
  )
  const [dismissedFirstErrorPopUp, setDismissedFirstErrorPopUp] = useState(
    false
  )

  if (lastCompileTimestamp < compilerState.lastCompileTimestamp) {
    setLastCompileTimestamp(compilerState.lastCompileTimestamp)
    setSeenLogsForCurrentCompile(false)
  }

  if (showLogs && !seenLogsForCurrentCompile) {
    setSeenLogsForCurrentCompile(true)
  }

  const nErrors =
    compilerState.logEntries && compilerState.logEntries.errors
      ? compilerState.logEntries.errors.length
      : 0
  const nWarnings =
    compilerState.logEntries && compilerState.logEntries.warnings
      ? compilerState.logEntries.warnings.length
      : 0
  const nLogEntries =
    compilerState.logEntries && compilerState.logEntries.all
      ? compilerState.logEntries.all.length
      : 0

  const hasCLSIErrors =
    compilerState.errors &&
    Object.keys(compilerState.errors).length > 0 &&
    compilerState.compileFailed &&
    !compilerState.isCompiling

  const hasValidationIssues =
    compilerState.validationIssues &&
    Object.keys(compilerState.validationIssues).length > 0 &&
    compilerState.compileFailed &&
    !compilerState.isCompiling

  const showFirstErrorPopUp =
    nErrors > 0 &&
    !seenLogsForCurrentCompile &&
    !dismissedFirstErrorPopUp &&
    !compilerState.isCompiling

  function handleFirstErrorPopUpClose() {
    setDismissedFirstErrorPopUp(true)
  }

  return (
    <>
      <PreviewToolbar
        compilerState={compilerState}
        logsState={{ nErrors, nWarnings, nLogEntries }}
        showLogs={showLogs}
        onClearCache={onClearCache}
        onRecompile={onRecompile}
        onRunSyntaxCheckNow={onRunSyntaxCheckNow}
        onSetAutoCompile={onSetAutoCompile}
        onSetDraftMode={onSetDraftMode}
        onSetSyntaxCheck={onSetSyntaxCheck}
        onToggleLogs={onToggleLogs}
        outputFiles={outputFiles}
        pdfDownloadUrl={pdfDownloadUrl}
      />
      <span aria-live="polite" className="sr-only">
        {hasCLSIErrors ? t('compile_error_description') : ''}
      </span>
      <span aria-live="polite" className="sr-only">
        {hasValidationIssues ? t('validation_issue_description') : ''}
      </span>
      <span aria-live="polite" className="sr-only">
        {nErrors && !compilerState.isCompiling
          ? t('n_errors', { count: nErrors })
          : ''}
      </span>
      <span aria-live="polite" className="sr-only">
        {nWarnings && !compilerState.isCompiling
          ? t('n_warnings', { count: nWarnings })
          : ''}
      </span>
      {showFirstErrorPopUp ? (
        <PreviewFirstErrorPopUp
          logEntry={compilerState.logEntries.errors[0]}
          onGoToErrorLocation={onLogEntryLocationClick}
          onViewLogs={onToggleLogs}
          onClose={handleFirstErrorPopUpClose}
        />
      ) : null}
      {showLogs ? (
        <PreviewLogsPane
          logEntries={compilerState.logEntries.all}
          rawLog={compilerState.rawLog}
          validationIssues={compilerState.validationIssues}
          errors={compilerState.errors}
          onLogEntryLocationClick={onLogEntryLocationClick}
        />
      ) : null}
    </>
  )
}

PreviewPane.propTypes = {
  compilerState: PropTypes.shape({
    isAutoCompileOn: PropTypes.bool.isRequired,
    isCompiling: PropTypes.bool.isRequired,
    isDraftModeOn: PropTypes.bool.isRequired,
    isSyntaxCheckOn: PropTypes.bool.isRequired,
    lastCompileTimestamp: PropTypes.number,
    logEntries: PropTypes.object,
    validationIssues: PropTypes.object,
    errors: PropTypes.object,
    rawLog: PropTypes.string,
    compileFailed: PropTypes.bool
  }),
  onClearCache: PropTypes.func.isRequired,
  onLogEntryLocationClick: PropTypes.func.isRequired,
  onRecompile: PropTypes.func.isRequired,
  onRunSyntaxCheckNow: PropTypes.func.isRequired,
  onSetAutoCompile: PropTypes.func.isRequired,
  onSetDraftMode: PropTypes.func.isRequired,
  onSetSyntaxCheck: PropTypes.func.isRequired,
  onToggleLogs: PropTypes.func.isRequired,
  outputFiles: PropTypes.array,
  pdfDownloadUrl: PropTypes.string,
  showLogs: PropTypes.bool.isRequired
}

export default PreviewPane
