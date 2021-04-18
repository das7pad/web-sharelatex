import React from 'react'
import { Modal } from 'react-bootstrap'
import { useFileTreeActionable } from '../../contexts/file-tree-actionable'
import FileTreeCreateFormProvider from '../../contexts/file-tree-create-form'
import FileTreeModalCreateFileBody from '../file-tree-create/file-tree-modal-create-file-body'
import FileTreeModalCreateFileFooter from '../file-tree-create/file-tree-modal-create-file-footer'
import AccessibleModal from '../../../../shared/components/accessible-modal'
import BetaBadge from '../../../../shared/components/beta-badge'
import t from '../../../../misc/t'

export default function FileTreeModalCreateFile() {
  const { isCreatingFile, cancel } = useFileTreeActionable()
  if (!isCreatingFile) {
    return null
  }

  const tooltip = {
    id: 'create-file-beta-tooltip',
    text: t('beta_badge_tooltip', { feature: 'adding files' })
  }

  return (
    <FileTreeCreateFormProvider>
      <AccessibleModal bsSize="large" onHide={cancel} show>
        <Modal.Header closeButton>
          <Modal.Title>
            Add Files &nbsp;
            <BetaBadge tooltip={tooltip} />
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="modal-new-file">
          <FileTreeModalCreateFileBody />
        </Modal.Body>

        <Modal.Footer>
          <FileTreeModalCreateFileFooter />
        </Modal.Footer>
      </AccessibleModal>
    </FileTreeCreateFormProvider>
  )
}
