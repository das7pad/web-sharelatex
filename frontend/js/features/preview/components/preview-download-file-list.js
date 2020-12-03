import React from 'react'
import PropTypes from 'prop-types'
import { MenuItem } from 'react-bootstrap'
import t from '../../../misc/t'

export const topFileTypes = ['bbl', 'gls', 'ind']

function PreviewDownloadFileList({ fileList = [] }) {
  let topFiles = []
  let otherFiles = []

  if (fileList) {
    topFiles = fileList.filter(file => {
      if (topFileTypes.includes(file.type)) {
        return file
      }
    })

    otherFiles = fileList.filter(file => {
      if (!topFileTypes.includes(file.type)) {
        if (file.type === 'pdf' && file.main === true) return
        return file
      }
    })
  }

  return (
    <>
      <MenuItem header>{t('other_output_files')}</MenuItem>
      <SubFileList subFileList={topFiles} listType="main" />
      {otherFiles.length > 0 && topFiles.length > 0 ? (
        <>
          <MenuItem divider />
        </>
      ) : (
        <></>
      )}
      {otherFiles.length > 0 ? (
        <>
          <SubFileList subFileList={otherFiles} listType="other" />
        </>
      ) : (
        <></>
      )}
    </>
  )
}

function SubFileList({ subFileList, listType }) {
  return subFileList.map((file, index) => {
    return (
      <MenuItem download href={file.url} key={`${listType}${index}`}>
        <b>{file.fileName}</b>
      </MenuItem>
    )
  })
}

SubFileList.propTypes = {
  subFileList: PropTypes.array.isRequired,
  listType: PropTypes.string.isRequired
}

PreviewDownloadFileList.propTypes = {
  fileList: PropTypes.array
}

export default PreviewDownloadFileList
