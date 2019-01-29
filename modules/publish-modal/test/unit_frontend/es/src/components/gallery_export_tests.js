/* global sinon */

import React from 'react'
import {
  render,
  cleanup,
  fireEvent,
  waitForElement
} from 'react-testing-library'

import GalleryExport from 'Modules/publish-modal/public/es/src/components/gallery_export'

describe('<GalleryExport />', function() {
  let ajaxStub

  this.timeout(5000)

  beforeEach(() => {
    window.ExposedSettings = { siteUrl: 'http://example.com' }
  })

  afterEach(() => {
    delete window.ExposedSettings
    cleanup()
  })

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

    it('sends data when starting export', () => {
      ajaxStub
        .onSecondCall()
        .returns(
          $.Deferred().resolve({ export_json: { status_summary: 'succeeded' } })
        )
      const { getByLabelText, getByText } = renderGalleryExport()

      const licenseSelect = getByLabelText(/license/i)
      fireEvent.change(licenseSelect, { target: { value: 'cc_by_4.0' } })
      const submitButton = getByText(/submit to myjournal/i)
      fireEvent.click(submitButton)

      const { data } = $.ajax.firstCall.args[0]
      expect(data.author).to.equal('Author Name')
      expect(data.title).to.equal('My title')
      expect(data.description).to.equal('My description')
      expect(data.license).to.equal('cc_by_4.0')
      expect(data.showSource).to.be.true

      return waitForElement(() => getByText(/export successful/i))
    })

    it('waits for download poll to succeed', () => {
      ajaxStub
        .onSecondCall()
        .returns(
          $.Deferred().resolve({ export_json: { status_summary: 'succeeded' } })
        )
      const { getByLabelText, getByText } = renderGalleryExport()

      const licenseSelect = getByLabelText(/license/i)
      fireEvent.change(licenseSelect, { target: { value: 'cc_by_4.0' } })
      const submitButton = getByText(/submit to myjournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByText(/exporting files/i))
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
        .returns($.Deferred().resolve({ export_json: {} }))
        // Mock second poll request to succeed
        .onThirdCall()
        .returns(
          $.Deferred().resolve({ export_json: { status_summary: 'succeeded' } })
        )

      const { getByLabelText, getByText } = renderGalleryExport()

      const licenseSelect = getByLabelText(/license/i)
      fireEvent.change(licenseSelect, { target: { value: 'cc_by_4.0' } })
      const submitButton = getByText(/submit to myjournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByText(/exporting files/i))
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
      ajaxStub.onSecondCall().returns($.Deferred().reject(new Error()))

      const { getByLabelText, getByText } = renderGalleryExport()

      const licenseSelect = getByLabelText(/license/i)
      fireEvent.change(licenseSelect, { target: { value: 'cc_by_4.0' } })
      const submitButton = getByText(/submit to myjournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByText(/exporting files/i))
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

      const { getByLabelText, getByText } = renderGalleryExport()

      const licenseSelect = getByLabelText(/license/i)
      fireEvent.change(licenseSelect, { target: { value: 'cc_by_4.0' } })
      const submitButton = getByText(/submit to myjournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByText(/exporting files/i))
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

function renderGalleryExport() {
  return render(
    <GalleryExport
      returnText="Return"
      entry={{
        id: 2,
        name: 'MyJournal'
      }}
      onReturn={() => {}}
      projectId="1"
      author="Author Name" /* Use default data */
      title="My title"
      description="My description"
      showSource={true}
    />
  )
}
