/* eslint-disable
    max-len,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([], function() {
  class RichTextAdapter {
    constructor(fileTreeManager) {
      this.fileTreeManager = fileTreeManager
    }

    fileExistsForPath(path) {
      const entity = this.fileTreeManager.findEntityByPath(path)
      return !!entity
    }

    getEntityForPath(path) {
      // Handle paths that are missing
      let entity
      for (let extension of ['', '.png', '.pdf', '.jpg', '.jpeg', '.eps']) {
        entity = this.fileTreeManager.findEntityByPath(`${path}${extension}`)
        if (entity) {
          break
        }
      }
      return entity
    }

    getPreviewUrlForEntity(entity) {
      return `/project/${window.project_id}/file/${entity.id}`
    }

    isPreviewableEntity(entity) {
      return !['eps', 'pdf'].includes(getExtension(entity))
    }
  }

  function getExtension(entity) {
    if (entity && entity.name) {
      const extension = entity.name.split('.').pop()
      return extension ? extension.toLowerCase() : null
    } else {
      return null
    }
  }

  return RichTextAdapter
})
