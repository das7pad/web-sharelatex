const { pipeline } = require('stream')
const logger = require('logger-sharelatex')
const Settings = require('settings-sharelatex')

const FileStoreHandler = require('./FileStoreHandler')
const ProjectLocator = require('../Project/ProjectLocator')
const Errors = require('../Errors/Errors')

module.exports = {
  getFile(req, res) {
    const projectId = req.params.Project_id
    const fileId = req.params.File_id
    const queryString = req.query
    const userAgent = req.get('User-Agent')
    ProjectLocator.findElement(
      { project_id: projectId, element_id: fileId, type: 'file' },
      function(err, file) {
        if (err) {
          logger.err(
            { err, projectId, fileId, queryString },
            'error finding element for downloading file'
          )
          return res.sendStatus(500)
        }
        FileStoreHandler.getFileStream(projectId, fileId, queryString, function(
          err,
          readReq
        ) {
          if (err) {
            logger.err(
              { err, projectId, fileId, queryString },
              'error getting file stream for downloading file'
            )
            return res.sendStatus(500)
          }
          readReq.on('error', () => {
            // The error is logged in FileStoreHandler.
            res.sendStatus(500)
          })
          readReq.on('response', function(response) {
            for (const name of Settings.apis.filestore.passthroughHeaders) {
              const passThroughValue = response.headers[name]
              if (passThroughValue) res.append(name, passThroughValue)
            }

            const { statusCode } = response
            if (statusCode !== 200) {
              logger.err(
                { err, projectId, fileId, queryString, statusCode },
                'unexpected response status for downloading file'
              )
              return res.sendStatus(500)
            }
            // mobile safari will try to render html files, prevent this
            if (isMobileSafari(userAgent) && isHtml(file)) {
              res.setHeader('Content-Type', 'text/plain')
            }
            res.attachment(file.name)
            pipeline(response, res, err => {
              if (err) {
                logger.warn(
                  { err, projectId, fileId, queryString },
                  'proxying error for downloading file'
                )
              }
            })
          })
        })
      }
    )
  },

  getFileHead(req, res) {
    const projectId = req.params.Project_id
    const fileId = req.params.File_id
    FileStoreHandler.getFileSize(projectId, fileId, (err, fileSize) => {
      if (err) {
        if (err instanceof Errors.NotFoundError) {
          res.status(404).end()
        } else {
          logger.err({ err, projectId, fileId }, 'error getting file size')
          res.status(500).end()
        }
        return
      }
      res.set('Content-Length', fileSize)
      res.status(200).end()
    })
  }
}

function isHtml(file) {
  return (
    fileEndsWith(file, '.html') ||
    fileEndsWith(file, '.htm') ||
    fileEndsWith(file, '.xhtml')
  )
}

function fileEndsWith(file, ext) {
  return (
    file.name != null &&
    file.name.length > ext.length &&
    file.name.lastIndexOf(ext) === file.name.length - ext.length
  )
}

function isMobileSafari(userAgent) {
  return (
    userAgent &&
    (userAgent.indexOf('iPhone') >= 0 || userAgent.indexOf('iPad') >= 0)
  )
}
