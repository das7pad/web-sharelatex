import React from 'react'
import PropTypes from 'prop-types'
import Icon from './icon'
import t from '../../misc/t'

function Processing({ isProcessing }) {
  if (isProcessing) {
    return (
      <div aria-live="polite">
        {t('processing')}… <Icon type="fw" modifier="refresh" spin />
      </div>
    )
  } else {
    return <></>
  }
}

Processing.propTypes = {
  isProcessing: PropTypes.bool.isRequired,
}

export default Processing
