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
      this.fileTreeManager = fileTreeManager;
    }

    fileExistsForPath(path) {
      const entity = this.fileTreeManager.findEntityByPath(path);
      return !!entity;
    }

    getPreviewUrlForPath(path) {
      // Handle paths that are missing
      let entity;
      for (let extension of ['', '.png', '.pdf', '.jpg', '.jpeg']) {
        entity = this.fileTreeManager.findEntityByPath(`${path}${extension}`);
        if (entity) { break; }
      }
      if (!entity) { return null; }
      const queryString = isPreviewable(entity) ? '?format=png' : '';
      return `/project/${window.project_id}/file/${entity.id}${queryString}`;
    }
  }

  var isPreviewable = entity => ['eps', 'pdf'].includes(getExtension(entity));

  var getExtension = entity => __guard__(__guard__(entity != null ? entity.name : undefined, x1 => x1.split(".").pop()), x => x.toLowerCase());

  return RichTextAdapter;
});

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}