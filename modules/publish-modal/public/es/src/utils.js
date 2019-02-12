/* global $, _ */

export function findEntryInCategories(categories, id) {
  let entry
  _.forEach(categories, category => {
    if (!entry) {
      entry = _.find(category.entries, entry => {
        return entry.id === id
      })
    }
  })
  return entry
}

export function initiateExport(entry, projectId, data) {
  const url = `/project/${projectId}/export/${entry.id}`

  return startExport(url, data).then(startResponse => {
    return pollExportStatus(startResponse.export_v1_id, projectId)
      .then(pollResponse => {
        const authorName = [
          pollResponse.export_json.v2_user_first_name,
          pollResponse.export_json.v2_user_last_name
        ]
          .filter(Boolean)
          .join(' ')

        // FIXME: just return the whole combined {start,poll}Response objects?
        // Arguably this is just the network layer that shouldn't know
        // anything about business logic
        return {
          exportId: startResponse.export_v1_id,
          token: pollResponse.export_json.token,
          submissionId: pollResponse.export_json.partner_submission_id,
          authorEmail: pollResponse.export_json.v2_user_email,
          authorName,
          title: pollResponse.export_json.title
        }
      })
      .catch(error => {
        // Rethrow with nicely formatted data
        throw new Error(
          (error.export_json && error.export_json.status_detail) || null
        )
      })
  })
}

function startExport(url, data = {}) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url,
      type: 'POST',
      data,
      headers: { 'X-CSRF-Token': window.csrfToken }
    })
      .done(resolve)
      .fail(res => {
        reject(new Error(res.responseJSON && res.responseJSON.message) || null)
      })
  })
}

function pollExportStatus(exportId, projectId) {
  const siteUrl = window.ExposedSettings.siteUrl
  const url = `${siteUrl}/project/${projectId}/export/${exportId}`
  return networkPoll(
    { url },
    ({ export_json: status }) => status.status_summary === 'succeeded',
    ({ export_json: status }) => status.status_summary === 'failed'
  )
}

function networkPoll(ajaxOpts, checkSuccess, checkError, timeout = 1000) {
  return new Promise((resolve, reject) => {
    function poll() {
      $.ajax(ajaxOpts)
        .done(res => {
          if (checkError(res)) {
            reject(res)
          } else if (checkSuccess(res)) {
            resolve(res)
          } else {
            setTimeout(() => {
              if (timeout < 10000) {
                timeout = timeout + 1000
              }
              poll()
            }, timeout)
          }
        })
        .fail(reject)
    }
    poll()
  })
}
