import React, { useState } from 'react'
import t from '../../../misc/t'
import getMeta from '../../../utils/meta'

const OPT_IN = true
const OPT_OUT = false

const REQUEST_IDLE = ''
const REQUEST_PENDING = 'pending'
const REQUEST_ERROR = 'error'

export default function BetaProgramParticipate() {
  const [participates, setParticipates] = useState(
    getMeta('ol-participatesBetaProgram') ? OPT_IN : OPT_OUT
  )
  const [requestStatus, setRequestStatus] = useState(REQUEST_IDLE)

  function persistAction(action) {
    const url = action === OPT_IN ? '/beta/opt-in' : '/beta/opt-out'
    const headers = new Headers([
      ['Accept', 'application/json'],
      ['X-CSRF-Token', getMeta('ol-csrfToken')]
    ])
    setRequestStatus(REQUEST_PENDING)
    fetch(url, { method: 'POST', headers })
      .then(response => {
        if (response.status !== 200) {
          throw new Error('unexpected response')
        }
        setParticipates(action)
        setRequestStatus(REQUEST_IDLE)
      })
      .catch(() => setRequestStatus(REQUEST_ERROR))
  }

  const participateStatus = participates ? (
    <>
      <p>{t('beta_program_already_participating')}.</p>
      <p>{t('thank_you_for_being_part_of_our_beta_program')}.</p>
    </>
  ) : (
    <>
      <p>{t('beta_program_benefits')}.</p>
    </>
  )

  const howItWorks = (
    <>
      <p>
        <strong>How it works:</strong>
      </p>
      <ul>
        <li>
          {t('beta_program_badge_description')}
          <span
            aria-label={t('beta_feature_badge')}
            role="img"
            className={'beta-feature-badge'}
          />
        </li>
        <li>
          {t('you_will_be_able_to_contact_us_any_time_to_share_your_feedback')}.
        </li>
        <li>
          {t(
            'we_may_also_contact_you_from_time_to_time_by_email_with_a_survey'
          )}
          .
        </li>
        <li>
          {t('you_can_opt_in_and_out_of_the_program_at_any_time_on_this_page')}.
        </li>
      </ul>
    </>
  )

  function optIn(event) {
    event.stopPropagation()
    persistAction(OPT_IN)
  }
  function optOut(event) {
    event.stopPropagation()
    persistAction(OPT_OUT)
  }
  const cta = participates ? (
    <>
      <div className={'form-group'}>
        <a
          href="https://forms.gle/CFEsmvZQTAwHCd3X9"
          target="_blank"
          rel="noopener noreferrer"
          className={'btn btn-primary btn-lg'}
        >
          {t('give_feedback')}
        </a>
      </div>
      <div className={'form-group'}>
        <button
          type={'submit'}
          disabled={requestStatus === REQUEST_PENDING}
          className={'btn btn-info btn-sm'}
          onClick={optOut}
        >
          {t('beta_program_opt_out_action')}
        </button>
      </div>
    </>
  ) : (
    <>
      <div className={'form-group'}>
        <button
          type={'submit'}
          disabled={requestStatus === REQUEST_PENDING}
          className={'btn btn-primary'}
          onClick={optIn}
        >
          {t('beta_program_opt_in_action')}
        </button>
      </div>
    </>
  )

  const visualRequestStatus =
    requestStatus === REQUEST_ERROR ? (
      <div className={'alert alert-danger'}>
        {t('error_performing_request')}
      </div>
    ) : (
      <></>
    )

  const cardBody = (
    <>
      <div className={'row'}>
        <div className={'col-md-12'}>
          {participateStatus}
          {howItWorks}
        </div>
      </div>
      <div className={'row text-centered'}>
        <div className={'col-md-12'}>
          {cta}
          {visualRequestStatus}
          <div className={'form-group'}>
            <a href="/project" className={'btn btn-link btn-sm'}>
              {t('back_to_your_projects')}
            </a>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <div className={'container beta-opt-in-wrapper'}>
      <div className={'row'}>
        <div className={'col-md-10 col-md-offset-1 col-lg-8 col-lg-offset-2'}>
          <div className={'card'}>
            <div className={'page-header text-centered'}>
              <h1>{t('sharelatex_beta_program')}</h1>
            </div>
            <div className={'beta-opt-in'}>
              <div className={'container-fluid'}>{cardBody}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
