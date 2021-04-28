import React, { useState } from 'react'
import PropTypes from 'prop-types'
import classNames from 'classnames'
import t from '../../../misc/t'
import getMeta from '../../../utils/meta'

const PENDING = 0
const FAILED = 1
const DONE = 2

export default function ImgPreview({ file }) {
  const projectId = getMeta('ol-project_id')
  const url = `/project/${projectId}/file/${file.id}`

  const [status, setStatus] = useState(PENDING)
  function doneLoading() {
    setStatus(DONE)
  }
  function failedToLoad() {
    setStatus(FAILED)
  }
  return (
    <>
      {status !== FAILED ? (
        <img
          src={url}
          alt={file.name}
          className={classNames({
            'img-preview': status === PENDING,
          })}
          onError={failedToLoad}
          onAbort={failedToLoad}
          onLoad={doneLoading}
        />
      ) : (
        <p className="no-preview">{t('no_preview_available')}</p>
      )}
    </>
  )
}

ImgPreview.propTypes = {
  file: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
  }).isRequired,
}
