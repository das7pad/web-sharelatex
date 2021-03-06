import React from 'react'
import { useProjectContext } from './share-project-modal'
import { Col, Row } from 'react-bootstrap'
import { Trans } from '../../../components/trans'

export default function OwnerInfo() {
  const project = useProjectContext()

  return (
    <Row className="project-member">
      <Col xs={7}>{project.owner?.email}</Col>
      <Col xs={3} className="text-left">
        <Trans i18nKey="owner" />
      </Col>
    </Row>
  )
}
