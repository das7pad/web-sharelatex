import React from 'react'
import PropTypes from 'prop-types'
import { Dropdown, MenuItem } from 'react-bootstrap'
import t from '../../../misc/t'
import Icon from '../../../shared/components/icon'

function PreviewRecompileButton({
  compilerState: {
    isAutoCompileOn,
    isClearingCache,
    isCompiling,
    isDraftModeOn,
    isSyntaxCheckOn
  },
  onClearCache,
  onRecompile,
  onRunSyntaxCheckNow,
  onSetAutoCompile,
  onSetDraftMode,
  onSetSyntaxCheck
}) {
  function handleRecompileFromScratch() {
    onClearCache()
      .then(() => {
        onRecompile()
      })
      .catch(error => {
        console.error(error)
      })
  }

  function handleSelectAutoCompileOn() {
    onSetAutoCompile(true)
  }

  function handleSelectAutoCompileOff() {
    onSetAutoCompile(false)
  }

  function handleSelectDraftModeOn() {
    onSetDraftMode(true)
  }

  function handleSelectDraftModeOff() {
    onSetDraftMode(false)
  }

  function handleSelectSyntaxCheckOn() {
    onSetSyntaxCheck(true)
  }

  function handleSelectSyntaxCheckOff() {
    onSetSyntaxCheck(false)
  }

  return (
    <Dropdown id="pdf-recompile-dropdown" className="btn-recompile-group">
      <button className="btn btn-recompile" onClick={onRecompile}>
        <Icon type="refresh" spin={isCompiling} />
        {isCompiling || isClearingCache ? (
          <span className="btn-recompile-label">{t('compiling')} &hellip;</span>
        ) : (
          <span className="btn-recompile-label">{t('recompile')}</span>
        )}
      </button>
      <Dropdown.Toggle
        aria-label={t('toggle_compile_options_menu')}
        className="btn btn-recompile"
      />
      <Dropdown.Menu>
        <MenuItem header>{t('auto_compile')}</MenuItem>
        <MenuItem onSelect={handleSelectAutoCompileOn}>
          <Icon type={isAutoCompileOn ? 'check' : ''} modifier="fw" />
          {t('on')}
        </MenuItem>
        <MenuItem onSelect={handleSelectAutoCompileOff}>
          <Icon type={!isAutoCompileOn ? 'check' : ''} modifier="fw" />
          {t('off')}
        </MenuItem>
        <MenuItem header>{t('compile_mode')}</MenuItem>
        <MenuItem onSelect={handleSelectDraftModeOff}>
          <Icon type={!isDraftModeOn ? 'check' : ''} modifier="fw" />
          {t('normal')}
        </MenuItem>
        <MenuItem onSelect={handleSelectDraftModeOn}>
          <Icon type={isDraftModeOn ? 'check' : ''} modifier="fw" />
          {t('fast')} <span className="subdued">[draft]</span>
        </MenuItem>
        <MenuItem header>Syntax Checks</MenuItem>
        <MenuItem onSelect={handleSelectSyntaxCheckOn}>
          <Icon type={isSyntaxCheckOn ? 'check' : ''} modifier="fw" />
          {t('stop_on_validation_error')}
        </MenuItem>
        <MenuItem onSelect={handleSelectSyntaxCheckOff}>
          <Icon type={!isSyntaxCheckOn ? 'check' : ''} modifier="fw" />
          {t('ignore_validation_errors')}
        </MenuItem>
        <MenuItem onSelect={onRunSyntaxCheckNow}>
          <Icon type="" modifier="fw" />
          {t('run_syntax_check_now')}
        </MenuItem>
        <MenuItem divider />
        <MenuItem
          onSelect={handleRecompileFromScratch}
          disabled={isCompiling || isClearingCache}
          aria-disabled={!!(isCompiling || isClearingCache)}
        >
          {t('recompile_from_scratch')}
        </MenuItem>
      </Dropdown.Menu>
    </Dropdown>
  )
}

PreviewRecompileButton.propTypes = {
  compilerState: PropTypes.shape({
    isAutoCompileOn: PropTypes.bool.isRequired,
    isClearingCache: PropTypes.bool.isRequired,
    isCompiling: PropTypes.bool.isRequired,
    isDraftModeOn: PropTypes.bool.isRequired,
    isSyntaxCheckOn: PropTypes.bool.isRequired,
    logEntries: PropTypes.object.isRequired
  }),
  onClearCache: PropTypes.func.isRequired,
  onRecompile: PropTypes.func.isRequired,
  onRunSyntaxCheckNow: PropTypes.func.isRequired,
  onSetAutoCompile: PropTypes.func.isRequired,
  onSetDraftMode: PropTypes.func.isRequired,
  onSetSyntaxCheck: PropTypes.func.isRequired
}

export default PreviewRecompileButton
