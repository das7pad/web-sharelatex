/* eslint-disable
    max-len,
    no-return-assign,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base', 'ide/file-tree/util/iconTypeFromName'], function(
  App,
  iconTypeFromName
) {
  const historyFileEntityController = function($scope, $element, $attrs) {
    const ctrl = this
    ctrl.hasOperation = false
    ctrl.getRenameTooltip = i18nRenamedStr => {
      let [simplifiedOldPathname, simplifiedPathname] = _getSimplifiedPaths(
        ctrl.fileEntity.oldPathname,
        ctrl.fileEntity.pathname
      )
      return `${i18nRenamedStr} <strong>${simplifiedOldPathname}</strong> &rarr; <strong>${simplifiedPathname}</strong>`
    }
    ctrl.getFileOperationName = (
      i18nEditedStr,
      i18nRenamedStr,
      i18nCreatedStr,
      i18nDeletedStr
    ) => {
      if (ctrl.fileEntity.operation === 'edited') {
        return i18nEditedStr
      } else if (ctrl.fileEntity.operation === 'renamed') {
        return i18nRenamedStr
      } else if (ctrl.fileEntity.operation === 'added') {
        return i18nCreatedStr
      } else if (ctrl.fileEntity.operation === 'removed') {
        return i18nDeletedStr
      } else {
        return ''
      }
    }

    const _getSimplifiedPaths = (path1, path2) => {
      let path1Parts = path1.split('/')
      let path2Parts = path2.split('/')
      let maxIterations = Math.min(path1Parts.length, path2Parts.length) - 1
      for (
        var commonPartIndex = 0;
        commonPartIndex < maxIterations;
        commonPartIndex++
      ) {
        if (path1Parts[commonPartIndex] !== path2Parts[commonPartIndex]) {
          break
        }
      }
      path1Parts.splice(0, commonPartIndex)
      path2Parts.splice(0, commonPartIndex)
      return [path1Parts.join('/'), path2Parts.join('/')]
    }

    const _handleFolderClick = function() {
      ctrl.isOpen = !ctrl.isOpen
      ctrl.entityTypeIconClass = _getFolderIcon()
    }

    const _handleFileClick = () =>
      ctrl.historyFileTreeController.handleEntityClick(ctrl.fileEntity)
    var _getFolderIcon = function() {
      if (ctrl.isOpen) {
        return 'fa-folder-open'
      } else {
        return 'fa-folder'
      }
    }
    ctrl.$onInit = function() {
      if (ctrl.fileEntity.type === 'folder') {
        ctrl.isOpen = true
        ctrl.entityTypeIconClass = _getFolderIcon()
        ctrl.handleClick = _handleFolderClick
      } else {
        if (ctrl.fileEntity.operation) {
          ctrl.hasOperation = true
        }
        ctrl.entityTypeIconClass = `fa-${iconTypeFromName(
          ctrl.fileEntity.name
        )}`
        ctrl.entityOpTextClass = ctrl.fileEntity.operation
          ? `history-file-entity-name-${ctrl.fileEntity.operation}`
          : null
        ctrl.handleClick = _handleFileClick
        $scope.$watch(
          () => ctrl.historyFileTreeController.selectedPathname,
          newPathname =>
            (ctrl.isSelected = ctrl.fileEntity.pathname === newPathname)
        )
      }
    }
  }

  return App.component('historyFileEntity', {
    require: {
      historyFileTreeController: '^historyFileTree'
    },
    bindings: {
      fileEntity: '<'
    },
    controller: historyFileEntityController,
    templateUrl: 'historyFileEntityTpl'
  })
})
