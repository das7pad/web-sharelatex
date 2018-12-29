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

export function initiateExport2(entry, projectId, data) {
  const url = `/project/${projectId}/export/${entry.id}`

  return startExport(url, data).then(startResponse => {
    return pollExportStatus2(startResponse.export_v1_id, projectId)
      .then(pollResponse => {
        const authorName = [
          pollResponse.v2_user_first_name,
          pollResponse.v2_user_last_name
        ]
          .filter(Boolean)
          .join(' ')

        return {
          exportId: startResponse.export_v1_id,
          token: pollResponse.token,
          submissionId: pollResponse.partner_submission_id,
          authorEmail: pollResponse.v2_user_email,
          authorName,
          title: pollResponse.title
        }
      })
      .catch(error => {
        // Rethrow with nicely formatted data
        throw new Error({
          errorDetails: error.status_detail || null
        })
      })
  })
}

function pollExportStatus2(exportId, projectId) {
  const url = `/project/${projectId}/export/${exportId}`
  return networkPoll(
    { url },
    ({ export_json: status }) => status.status_summary === 'succeeded',
    ({ export_json: status }) => status.status_summary === 'failed'
  )
}

export function initiateExport(entry, projectId, _this) {
  var link = `/project/${projectId}/export/${entry.id}`

  var data = {}
  if (_this.firstName) {
    data['firstName'] = _this.firstName.value
  }
  if (_this.lastName) {
    data['lastName'] = _this.lastName.value
  }
  if (_this.author) {
    data['author'] = _this.author.value
  }
  if (_this.description) {
    data['description'] = _this.description.value
  }
  if (_this.title) {
    data['title'] = _this.title.value
  }
  if (_this.license) {
    data['license'] = _this.license.value
  }
  if (_this.showSource) {
    data['showSource'] = _this.showSource.checked
  }

  _this.setState({ exportState: 'initiated' })

  startExport(link, data)
    .then(resp => {
      _this.setState({ exportId: resp.export_v1_id })
      pollExportStatus(resp.export_v1_id, projectId, _this, 1000)
    })
    .catch(() => {
      _this.setState({ exportState: 'error' })
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
      .fail(reject)
  })
}

function pollExportStatus(exportId, projectId, _this) {
  const siteUrl = window.ExposedSettings.siteUrl
  const url = `${siteUrl}/project/${projectId}/export/${exportId}`
  return networkPoll(
    { url },
    ({ export_json: status }) => status.status_summary === 'succeeded',
    ({ export_json: status }) => status.status_summary === 'failed'
  )
    .then(status => {
      _this.setState({
        exportState: 'complete',
        // for ScholarOne
        partner_submission_id: status.partner_submission_id,
        // for F1000/Wellcome
        authorEmail: status.v2_user_email,
        authorName: [status.v2_user_first_name, status.v2_user_last_name].join(
          ' '
        ),
        title: status.title,
        articleZipURL: url + '/zip',
        pdfURL: url + '/pdf',
        revisionURL: 'https://www.overleaf.com/learn/how-to/Overleaf_v2_FAQ',
        // general-purpose
        token: status.token
      })
    })
    .catch(status => {
      const state = { exportState: 'error' }
      if (status.status_detail) {
        state.errorDetails = status.status_detail
      }
      _this.setState(state)
    })
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
