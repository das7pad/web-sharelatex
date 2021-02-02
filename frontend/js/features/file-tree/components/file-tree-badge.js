import React from 'react'
import { OverlayTrigger, Tooltip } from 'react-bootstrap'
import t from '../../../misc/t'

function FileTreeBadge() {
  const tooltip = (
    <Tooltip id="file-tree-badge-tooltip">
      {t('file_tree_badge_tooltip')}
    </Tooltip>
  )

  return (
    <OverlayTrigger placement="bottom" overlay={tooltip} delayHide={100}>
      <a
        href="/beta/participate"
        target="_blank"
        rel="noopener noreferrer"
        className="badge beta-badge"
        onClick={ev => ev.stopPropagation()}
      >
        <span className="sr-only">{t('file_tree_badge_tooltip')}</span>
      </a>
    </OverlayTrigger>
  )
}

export default FileTreeBadge
