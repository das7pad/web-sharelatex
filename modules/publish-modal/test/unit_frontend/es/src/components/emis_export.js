/* global sinon */

import React from 'react'
import {
  render,
  cleanup,
  fireEvent,
  waitForElement
} from 'react-testing-library'

import EmisExport from '../../../../../public/es/src/components/emis_export'

describe('<EmisExport />', () => {
  let ajaxStub
  afterEach(cleanup)

  describe('successful initial request', () => {
    beforeEach(() => {
      // Mock export initial POST request to be successful
      ajaxStub = sinon
        .stub($, 'ajax')
        .onFirstCall()
        .returns(Promise.resolve({ export_v1_id: 3 }))
    })

    afterEach(() => {
      $.ajax.restore()
    })

    it('sends data when starting export', () => {
      ajaxStub
        .onSecondCall()
        .returns(
          Promise.resolve({ export_json: { status_summary: 'succeeded' } })
        )
      const { getByText } = renderEmisExport()

      const submitButton = getByText(/submit to myjournal/i)
      fireEvent.click(submitButton)

      const { data } = $.ajax.firstCall.args[0]
      expect(data.firstName).to.equal('FirstName')
      expect(data.lastName).to.equal('LastName')
    })

    it('waits for download poll to succeed', () => {
      // Mock poll request to succeed
      ajaxStub
        .onSecondCall()
        .returns(
          Promise.resolve({ export_json: { status_summary: 'succeeded' } })
        )
      const { getByText } = renderEmisExport()

      const submitButton = getByText(/submit to myjournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByText(/exporting files, please wait/i))
        .then(pollingText => {
          expect(pollingText).to.exist

          return waitForElement(() => getByText(/export successful/i))
        })
        .then(successMessage => {
          expect(successMessage).to.exist
        })
    })

    it('keeps polling until success polling response is received', () => {
      ajaxStub
        // Mock first poll request to be still pending
        .onSecondCall()
        .returns(Promise.resolve({ export_json: {} }))
        // Mock second poll request to succeed
        .onThirdCall()
        .returns(
          Promise.resolve({ export_json: { status_summary: 'succeeded' } })
        )

      const { getByText } = renderEmisExport()

      const submitButton = getByText(/submit to myjournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByText(/exporting files, please wait/i))
        .then(pollingText => {
          expect(pollingText).to.exist

          return waitForElement(() => getByText(/export successful/i))
        })
        .then(successMessage => {
          expect(successMessage).to.exist
        })
    })

    it('shows error on polling error response', () => {
      // Mock first poll request to fail
      ajaxStub.onSecondCall().returns(Promise.reject(new Error()))

      const { getByText } = renderEmisExport()

      const submitButton = getByText(/submit to myjournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByText(/exporting files, please wait/i))
        .then(pollingText => {
          expect(pollingText).to.exist

          return waitForElement(() => getByText(/export failed/i))
        })
        .then(successMessage => {
          expect(successMessage).to.exist
        })
    })

    it('shows error on successful polling response with failed message', () => {
      // Mock first poll request to succeed, but with failed message
      ajaxStub
        .onSecondCall()
        .returns(Promise.resolve({ export_json: { status_summary: 'failed' } }))

      const { getByText } = renderEmisExport()

      const submitButton = getByText(/submit to myjournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByText(/exporting files, please wait/i))
        .then(pollingText => {
          expect(pollingText).to.exist

          return waitForElement(() => getByText(/export failed/i))
        })
        .then(successMessage => {
          expect(successMessage).to.exist
        })
    })
  })
})

function renderEmisExport() {
  return render(
    <EmisExport
      returnText="Return"
      entry={{
        id: 2,
        name: 'MyJournal'
      }}
      onReturn={() => {}}
      projectId="1"
      hasFolders={false}
      firstName="FirstName"
      lastName="LastName"
    />
  )
}
