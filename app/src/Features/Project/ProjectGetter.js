/* eslint-disable
    camelcase,
    handle-callback-err,
    max-len,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS202: Simplify dynamic range loops
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const { db } = require('../../infrastructure/mongodb')
const { normalizeQuery } = require('../Helpers/Mongo')
const OError = require('@overleaf/o-error')
const metrics = require('@overleaf/metrics')
const async = require('async')
const { promisifyAll } = require('../../util/promises')
const { Project } = require('../../models/Project')
const logger = require('logger-sharelatex')
const LockManager = require('../../infrastructure/LockManager')
const { DeletedProject } = require('../../models/DeletedProject')

const ProjectGetter = {
  EXCLUDE_DEPTH: 8,

  getProjectWithoutDocLines(project_id, callback) {
    if (callback == null) {
      callback = function(error, project) {}
    }
    const excludes = {}
    for (
      let i = 1, end = ProjectGetter.EXCLUDE_DEPTH, asc = end >= 1;
      asc ? i <= end : i >= end;
      asc ? i++ : i--
    ) {
      excludes[`rootFolder${Array(i).join('.folders')}.docs.lines`] = 0
    }
    return ProjectGetter.getProject(project_id, excludes, callback)
  },

  getProjectWithOnlyFolders(project_id, callback) {
    if (callback == null) {
      callback = function(error, project) {}
    }
    const excludes = {}
    for (
      let i = 1, end = ProjectGetter.EXCLUDE_DEPTH, asc = end >= 1;
      asc ? i <= end : i >= end;
      asc ? i++ : i--
    ) {
      excludes[`rootFolder${Array(i).join('.folders')}.docs`] = 0
      excludes[`rootFolder${Array(i).join('.folders')}.fileRefs`] = 0
    }
    return ProjectGetter.getProject(project_id, excludes, callback)
  },

  getProject(project_id, projection, callback) {
    if (typeof projection === 'function' && callback == null) {
      callback = projection
      projection = {}
    }
    if (project_id == null) {
      return callback(new Error('no project_id provided'))
    }
    if (typeof projection !== 'object') {
      return callback(new Error('projection is not an object'))
    }

    if (
      (projection != null ? projection.rootFolder : undefined) ||
      Object.keys(projection).length === 0
    ) {
      const ProjectEntityMongoUpdateHandler = require('./ProjectEntityMongoUpdateHandler')
      return LockManager.runWithLock(
        ProjectEntityMongoUpdateHandler.LOCK_NAMESPACE,
        project_id,
        cb => ProjectGetter.getProjectWithoutLock(project_id, projection, cb),
        callback
      )
    } else {
      return ProjectGetter.getProjectWithoutLock(
        project_id,
        projection,
        callback
      )
    }
  },

  getProjectWithoutLock(project_id, projection, callback) {
    if (typeof projection === 'function' && callback == null) {
      callback = projection
      projection = {}
    }
    if (project_id == null) {
      return callback(new Error('no project_id provided'))
    }
    if (typeof projection !== 'object') {
      return callback(new Error('projection is not an object'))
    }

    let query
    try {
      query = normalizeQuery(project_id)
    } catch (err) {
      return callback(err)
    }

    return db.projects.findOne(query, { projection }, function(err, project) {
      if (err != null) {
        OError.tag(err, 'error getting project', {
          query,
          projection
        })
        return callback(err)
      }
      return callback(null, project)
    })
  },

  getProjectIdByReadAndWriteToken(token, callback) {
    if (callback == null) {
      callback = function(err, project_id) {}
    }
    return Project.findOne(
      { 'tokens.readAndWrite': token },
      { _id: 1 },
      function(err, project) {
        if (err != null) {
          return callback(err)
        }
        if (project == null) {
          return callback()
        }
        return callback(null, project._id)
      }
    )
  },

  getProjectByV1Id(v1_id, callback) {
    if (callback == null) {
      callback = function(err, v1_id) {}
    }
    return Project.findOne({ 'overleaf.id': v1_id }, { _id: 1 }, function(
      err,
      project
    ) {
      if (err != null) {
        return callback(err)
      }
      if (project == null) {
        return callback()
      }
      return callback(null, project._id)
    })
  },

  findAllUsersProjects(user_id, fields, callback) {
    if (callback == null) {
      callback = function(error, projects) {
        if (projects == null) {
          projects = {
            owned: [],
            readAndWrite: [],
            readOnly: [],
            tokenReadAndWrite: [],
            tokenReadOnly: []
          }
        }
      }
    }
    const CollaboratorsGetter = require('../Collaborators/CollaboratorsGetter')
    return Project.find({ owner_ref: user_id }, fields, function(
      error,
      ownedProjects
    ) {
      if (error != null) {
        return callback(error)
      }
      return CollaboratorsGetter.getProjectsUserIsMemberOf(
        user_id,
        fields,
        function(error, projects) {
          if (error != null) {
            return callback(error)
          }
          const result = {
            owned: ownedProjects || [],
            readAndWrite: projects.readAndWrite || [],
            readOnly: projects.readOnly || [],
            tokenReadAndWrite: projects.tokenReadAndWrite || [],
            tokenReadOnly: projects.tokenReadOnly || []
          }
          return callback(null, result)
        }
      )
    })
  },

  getUsersDeletedProjects(user_id, callback) {
    DeletedProject.find(
      {
        'deleterData.deletedProjectOwnerId': user_id
      },
      callback
    )
  }
}
;['getProject', 'getProjectWithoutDocLines'].map(method =>
  metrics.timeAsyncMethod(ProjectGetter, method, 'mongo.ProjectGetter', logger)
)

ProjectGetter.promises = promisifyAll(ProjectGetter)
module.exports = ProjectGetter
