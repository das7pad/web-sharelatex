import React from 'react'
import PropTypes from 'prop-types'
import PreviewToolbar from './preview-toolbar'
import PreviewLogsPane from './preview-logs-pane'
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
  onLogEntryLinkClick,
  showLogs
}) {
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
        {nErrors && !compilerState.isCompiling
          ? t('n_errors', { count: nErrors })
          : ''}
      </span>
      <span aria-live="polite" className="sr-only">
        {nWarnings && !compilerState.isCompiling
          ? t('n_warnings', { count: nWarnings })
          : ''}
      </span>
      {showLogs ? (
        <PreviewLogsPane
          logEntries={compilerState.logEntries.all}
          onLogEntryLinkClick={onLogEntryLinkClick}
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
    logEntries: PropTypes.object.isRequired
  }),
  onClearCache: PropTypes.func.isRequired,
  onLogEntryLinkClick: PropTypes.func.isRequired,
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
