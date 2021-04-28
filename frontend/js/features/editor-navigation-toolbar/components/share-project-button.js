import React from 'react'
import PropTypes from 'prop-types'
import Icon from '../../../shared/components/icon'
import t from '../../../misc/t'

function ShareProjectButton({ onClick }) {
  return (
    // eslint-disable-next-line jsx-a11y/anchor-is-valid,jsx-a11y/click-events-have-key-events,jsx-a11y/interactive-supports-focus
    <a role="button" className="btn btn-full-height" onClick={onClick}>
      <Icon type="fw" modifier="group" />
      <p className="toolbar-label">{t('share')}</p>
    </a>
  )
}

ShareProjectButton.propTypes = {
  onClick: PropTypes.func.isRequired,
}

export default ShareProjectButton
