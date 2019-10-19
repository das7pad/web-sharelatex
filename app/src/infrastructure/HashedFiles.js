/* eslint-disable
    max-len,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// This file was auto-generated, do not edit it directly.
// Instead run bin/update_build_scripts from
// https://github.com/das7pad/sharelatex-dev-env

let hashedFiles
const async = require('async')
const crypto = require('crypto')
const fs = require('fs')
const Path = require('path')

const logger = require('logger-sharelatex')

const REPOSITORY_ROOT = Path.join(__dirname, '../../../')
module.exports = hashedFiles = {}

const fillHashedFiles = function() {
  const pathList = [
    '/minjs/libs/require.js',
    '/minjs/ide.js',
    '/minjs/main.js',
    '/minjs/libraries.js',
    '/stylesheets/style.css',
    '/stylesheets/light-style.css',
    '/stylesheets/ieee-style.css',
    '/stylesheets/sl-style.css'
  ]

  const modulesPath = Path.join(REPOSITORY_ROOT, 'modules')
  for (let moduleName of Array.from(fs.readdirSync(modulesPath))) {
    const index = Path.join(modulesPath, moduleName, 'index.js')
    const content = fs.readFileSync(index, 'utf-8')
    const filesMatch = /assetFiles: \[(.+)\]/.exec(content)
    if (!filesMatch) {
      continue
    }
    for (let file of Array.from(filesMatch[1].split(','))) {
      pathList.push(Path.join('/minjs', /['"](.+)['"]/.exec(file)[1]))
    }
  }

  const md5 = function(path) {
    const buffer = fs.readFileSync(path)
    return crypto
      .createHash('md5')
      .update(buffer)
      .digest('hex')
  }

  const generateHash = function(path, done) {
    const fsPath = Path.join(REPOSITORY_ROOT, 'public', path)

    const hash = md5(fsPath)

    const extension = Path.extname(path)
    const filename = Path.basename(path, extension)
    const params = {
      dir: Path.dirname(path),
      name: `${filename}.${hash}`,
      ext: extension
    }
    const hashPath = Path.format(params)
    hashedFiles[path] = hashPath

    const fsHashPath = Path.join(REPOSITORY_ROOT, 'public', hashPath)

    return fs.stat(fsHashPath, function(err) {
      if (err == null) {
        logger.log({ path }, 'Nothing to do')
        return done()
      }

      if ((err != null ? err.code : undefined) === 'ENOENT') {
        logger.log({ path }, 'Creating symlink')
        return fs.symlink(`${filename}${extension}`, fsHashPath, function(err) {
          if (err != null) {
            logger.log({ path }, 'Creating symlink failed', err)
          }
          return done()
        })
      }
      logger.log({ path, err }, 'Calling stat failed')
      return done()
    })
  }

  logger.log('Started hashing static content')
  return async.map(pathList, generateHash, () =>
    logger.log('Finished hashing static content')
  )
}

const invokedDirectly = !module.parent
if (invokedDirectly || require('settings-sharelatex').useMinifiedJs) {
  fillHashedFiles()
}
