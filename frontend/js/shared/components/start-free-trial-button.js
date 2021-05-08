import React, { useCallback } from 'react'
import { Button } from 'react-bootstrap'
import PropTypes from 'prop-types'
import * as eventTracking from '../../infrastructure/event-tracking'
import t from '../../misc/t'

export default function StartFreeTrialButton({
  buttonStyle = 'info',
  children,
  classes = {},
  setStartedFreeTrial,
  source,
}) {
  const handleClick = useCallback(
    event => {
      event.preventDefault()

      eventTracking.send('subscription-funnel', 'upgraded-free-trial', source)

      const planCode = 'collaborator_free_trial_7_days'

      eventTracking.sendMB('subscription-start-trial', {
        source,
        plan: planCode,
      })

      if (setStartedFreeTrial) {
        setStartedFreeTrial(true)
      }

      const params = new URLSearchParams({
        planCode,
        ssp: 'true',
        itm_campaign: source,
      })

      window.open(`/user/subscription/new?${params}`)
    },
    [setStartedFreeTrial, source]
  )

  return (
    <Button
      bsStyle={buttonStyle}
      onClick={handleClick}
      className={classes.button}
    >
      {children || t('start_free_trial')}
    </Button>
  )
}
StartFreeTrialButton.propTypes = {
  buttonStyle: PropTypes.string,
  children: PropTypes.any,
  classes: PropTypes.shape({
    button: PropTypes.string.isRequired,
  }),
  setStartedFreeTrial: PropTypes.func,
  source: PropTypes.string.isRequired,
}
