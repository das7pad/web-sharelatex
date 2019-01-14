/* global sinon */

import React from 'react'
import {
  render,
  cleanup,
  fireEvent,
  waitForElement
} from 'react-testing-library'

import ScholarOneExport from '../../../../../public/es/src/components/scholar_one_export'

describe('<ScholarOneExport />', function() {
  let formSubmissionStub, formData, ajaxStub

  this.timeout(5000)

  beforeEach(() => {
    // Stub the globally exposed settings
    window.ExposedSettings = { siteUrl: 'http://example.com' }
    // The F1000 component triggers a form submission when the export is
    // complete. This causes problems with Karma because it throws an error if
    // the page is navigated away (through the form submission). We therefore
    // prevent the form submission from happening by calling preventDefault()
    // on the submit event
    formSubmissionStub = preventFormSubmission(formData)
    document.addEventListener('submit', formSubmissionStub)
  })

  afterEach(() => {
    delete window.ExposedSettings
    cleanup()
  })

  function preventFormSubmission() {
    return e => {
      e.preventDefault()

      // To assert that the form submission contains the correct data, we also
      // capture the form data and transform it an object with name/value pairs
      formData = Array.from(e.target.elements).reduce(
        (acc, elem) => Object.assign(acc, { [elem.name]: elem.value }),
        {}
      )
    }
  }

  describe('successful initial request', () => {
    beforeEach(() => {
      // Mock export initial POST request to be successful
      ajaxStub = sinon
        .stub($, 'ajax')
        .onFirstCall()
        .returns($.Deferred().resolve({ export_v1_id: 3 }))
    })

    afterEach(() => {
      $.ajax.restore()
    })

    it('waits for download poll to succeed', () => {
      ajaxStub
        .onSecondCall()
        .returns(
          $.Deferred().resolve({ export_json: { status_summary: 'succeeded' } })
        )

      const { getByText, getByTestId } = renderScholarOneExport()

      const submitButton = getByText(/submit to myjournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByText(/exporting files, please wait/i))
        .then(pollingText => {
          expect(pollingText).to.exist

          return waitForElement(() => getByTestId('export-complete'))
        })
        .then(completeEl => {
          expect(completeEl).to.exist
        })
    })

    it('keeps polling until success polling response is received', () => {
      ajaxStub
        // Mock first poll request to be still pending
        .onSecondCall()
        .returns($.Deferred().resolve({ export_json: {} }))
        // Mock second poll request to succeed
        .onThirdCall()
        .returns(
          $.Deferred().resolve({ export_json: { status_summary: 'succeeded' } })
        )

      const { getByText, getByTestId } = renderScholarOneExport()

      const submitButton = getByText(/submit to myjournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByText(/exporting files, please wait/i))
        .then(pollingText => {
          expect(pollingText).to.exist

          return waitForElement(() => getByTestId('export-complete'))
        })
        .then(completeEl => {
          expect(completeEl).to.exist
        })
    })

    it('sends request upon completion', () => {
      ajaxStub.onSecondCall().returns(
        $.Deferred().resolve({
          export_json: { status_summary: 'succeeded' },
          token: 'token',
          partner_submission_id: 4
        })
      )

      const { getByText, getByTestId } = renderScholarOneExport()

      const submitButton = getByText(/submit to myjournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByTestId('export-complete')).then(() => {
        expect(formData.export_id).to.equal('3token')
        expect(formData.submission_id).to.equal('4')
        expect(formData.EXT_ACTION).to.equal('OVERLEAF_SUBMISSION')
      })
    })

    it('shows error on polling error response', () => {
      // Mock first poll request to fail
      ajaxStub.onSecondCall().returns($.Deferred().reject(new Error()))

      const { getByText } = renderScholarOneExport()

      const submitButton = getByText(/submit to myjournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByText(/exporting files, please wait/i))
        .then(pollingText => {
          expect(pollingText).to.exist

          return waitForElement(() => getByText(/export failed/i))
        })
        .then(errorMessage => {
          expect(errorMessage).to.exist
        })
    })

    it('shows error on successful polling response with failed message', () => {
      // Mock first poll request to succeed, but with failed message
      ajaxStub
        .onSecondCall()
        .returns(
          $.Deferred().resolve({ export_json: { status_summary: 'failed' } })
        )

      const { getByText } = renderScholarOneExport()

      const submitButton = getByText(/submit to myjournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByText(/exporting files, please wait/i))
        .then(pollingText => {
          expect(pollingText).to.exist

          return waitForElement(() => getByText(/export failed/i))
        })
        .then(errorMessage => {
          expect(errorMessage).to.exist
        })
    })
  })
})

function renderScholarOneExport() {
  return render(
    <ScholarOneExport
      returnText="Return"
      entry={{
        id: 2,
        name: 'MyJournal',
        export_url: 'http://example.com'
      }}
      onReturn={() => {}}
      projectId="1"
    />
  )
}
