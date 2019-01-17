/* global sinon */

import React from 'react'
import {
  render,
  cleanup,
  fireEvent,
  waitForElement
} from 'react-testing-library'

import F1000Export from '../../../../../public/es/src/components/f1000_export'

describe('<F1000Export />', function() {
  let formData, ajaxStub

  this.timeout(5000)

  beforeEach(() => {
    // Stub the globally exposed settings
    window.ExposedSettings = { siteUrl: 'http://example.com' }
    // The F1000 component triggers a form submission when the export is
    // complete. This causes problems with Karma because it throws an error if
    // the page is navigated away (through the form submission). We therefore
    // prevent the form submission from happening by calling preventDefault()
    // on the submit event
    document.addEventListener('submit', preventFormSubmission)
  })

  afterEach(() => {
    delete window.ExposedSettings
    document.removeEventListener('submit', preventFormSubmission)
    cleanup()
  })

  function preventFormSubmission(e) {
    e.preventDefault()

    // To assert that the form submission contains the correct data, we also
    // capture the form data and transform it an object with name/value pairs
    formData = Array.from(e.target.elements).reduce(
      (acc, elem) => Object.assign(acc, { [elem.name]: elem.value }),
      {}
    )
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

      const { getByText, getByTestId } = renderF1000Export()

      const submitButton = getByText(/submit to MyJournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByText(/exporting files/i))
        .then(pollingText => {
          expect(pollingText).to.exist

          return waitForElement(() => getByTestId('export-complete'))
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

      const { getByText, getByTestId } = renderF1000Export()

      const submitButton = getByText(/submit to MyJournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByText(/exporting files/i))
        .then(pollingText => {
          expect(pollingText).to.exist

          return waitForElement(() => getByTestId('export-complete'))
        })
        .then(successMessage => {
          expect(successMessage).to.exist
        })
    })

    it('sends request upon completion', () => {
      ajaxStub.onSecondCall().returns(
        $.Deferred().resolve({
          export_json: { status_summary: 'succeeded' },
          v2_user_email: 'test@example.com',
          v2_user_first_name: 'FirstName',
          v2_user_last_name: 'LastName',
          title: 'My title'
        })
      )

      const { getByText, getByTestId } = renderF1000Export()

      const submitButton = getByText(/submit to MyJournal/i)
      fireEvent.click(submitButton)

      return waitForElement(() => getByTestId('export-complete')).then(() => {
        expect(formData.authorEmail).to.equal('test@example.com')
        expect(formData.authorName).to.equal('FirstName LastName')
        expect(formData.title).to.equal('My title')
        expect(formData.articleZipURL).to.equal('/project/1/export/2/zip')
        expect(formData.pdfURL).to.equal('/project/1/export/2/pdf')
        expect(formData.revisionURL).to.equal(
          'https://www.overleaf.com/learn/how-to/Overleaf_v2_FAQ'
        )
        expect(formData.submissionURL).to.equal('')
        expect(formData.publicationURL).to.equal('')
        expect(formData.rejectionURL).to.equal('')
        expect(formData.newVersionURL).to.equal('')
        expect(formData.articleId).to.equal('')
      })
    })

    it('shows error on polling error response', () => {
      // Mock first poll request to fail
      ajaxStub.onSecondCall().returns($.Deferred().reject(new Error()))

      const { getByText } = renderF1000Export()

      const submitButton = getByText(/submit to MyJournal/i)
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

      const { getByText } = renderF1000Export()

      const submitButton = getByText(/submit to MyJournal/i)
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

function renderF1000Export() {
  return render(
    <F1000Export
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
