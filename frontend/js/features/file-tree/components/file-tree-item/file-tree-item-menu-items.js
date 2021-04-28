import React from 'react'

import { MenuItem } from 'react-bootstrap'
import { useFileTreeActionable } from '../../contexts/file-tree-actionable'
import t from '../../../../misc/t'

function FileTreeItemMenuItems() {
  const {
    canRename,
    canDelete,
    canCreate,
    startRenaming,
    startDeleting,
    startCreatingFolder,
    startCreatingDocOrFile,
    startUploadingDocOrFile,
  } = useFileTreeActionable()

  return (
    <>
      {canRename ? (
        <MenuItem onClick={startRenaming}>{t('rename')}</MenuItem>
      ) : null}
      {canDelete ? (
        <MenuItem onClick={startDeleting}>{t('delete')}</MenuItem>
      ) : null}
      {canCreate ? (
        <>
          <MenuItem divider />
          <MenuItem onClick={startCreatingDocOrFile}>{t('new_file')}</MenuItem>
          <MenuItem onClick={startCreatingFolder}>{t('new_folder')}</MenuItem>
          <MenuItem onClick={startUploadingDocOrFile}>{t('upload')}</MenuItem>
        </>
      ) : null}
    </>
  )
}

export default FileTreeItemMenuItems
