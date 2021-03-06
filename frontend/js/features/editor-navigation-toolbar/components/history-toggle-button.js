import React from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import Icon from '../../../shared/components/icon'
import t from '../../../misc/t'

function HistoryToggleButton({ historyIsOpen, onClick }) {
  const classes = classNames('btn', 'btn-full-height', {
    active: historyIsOpen
  })

  return (
    // eslint-disable-next-line jsx-a11y/anchor-is-valid
    <a role="button" className={classes} href="#" onClick={onClick}>
      <Icon type="fw" modifier="history" />
      <p className="toolbar-label">{t('history')}</p>
    </a>
  )
}

HistoryToggleButton.propTypes = {
  historyIsOpen: PropTypes.bool,
  onClick: PropTypes.func.isRequired
}

export default HistoryToggleButton
