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
  $.ajax({
    url: link,
    type: 'POST',
    data: data,
    headers: { 'X-CSRF-Token': window.csrfToken },
    success: resp => {
      _this.setState({ exportId: resp.export_v1_id })
      pollExportStatus(resp.export_v1_id, projectId, _this, 1000)
    },
    error: resp => {
      _this.setState({ exportState: 'error' })
    }
  })
}

function pollExportStatus(exportId, projectId, _this, timeout) {
  var link = `/project/${projectId}/export/${exportId}`
  $.ajax({
    url: link,
    type: 'GET',
    success: resp => {
      const status = resp.export_json
      if (status.status_summary === 'failed') {
        _this.setState({
          exportState: 'error',
          errorDetails: status.status_detail
        })
      } else if (status.status_summary === 'succeeded') {
        _this.setState({
          exportState: 'complete',
          partner_submission_id: status.partner_submission_id,
          token: status.token
        })
      } else {
        setTimeout(function() {
          if (timeout < 10000) {
            timeout = timeout + 1000
          }
          pollExportStatus(exportId, projectId, _this, timeout)
        }, timeout)
      }
    },
    error: resp => {
      _this.setState({ exportState: 'error' })
    }
  })
}
