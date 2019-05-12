const WEB_PATH = '../../..'

const {db, ObjectId} = require(`${WEB_PATH}/app/js/infrastructure/mongojs`)
const ProjectImporter = require('../app/js/ProjectImport/ProjectImporter')
const async = require('async')
const request = require('request')
const minimist = require('minimist')
const settings = require('settings-sharelatex')

const backfillLabels = function (project, callback) {
  const project_id = project._id.toString()
  const v1_id = project.overleaf.id
  db.users.findOne({
    _id: project.owner_ref
  }, {
    overleaf: 1
  }, function (error, user) {
    if (error) {
      return callback(error)
    }
    if (!user || !user.overleaf || !user.overleaf.id) {
      return callback(new Error('no owner'))
    }
    const v1_owner_id = user.overleaf.id
    console.log('CHECKING FOR EXISTING LABELS', project_id, v1_id)
    request({
      method: 'GET',
      url: `${settings.apis.project_history.url}/project/${project_id}/labels`,
      json: true
    }, function (error, response, labels) {
      if (error) {
        return callback(error)
      }
      if (response.statusCode !== 200) {
        return callback(new Error(`bad status code: ${response.statusCode}`))
      }
      if (!labels) {
        return callback(new Error('no labels'))
      }
      if (labels.length > 0) {
        console.log('ALREADY IMPORTED', project_id, labels.length)
        return callback()
      } else {
        console.log('IMPORTING', project_id, v1_id, v1_owner_id)
      }
      ProjectImporter._importLabels(
        v1_id, project_id, v1_owner_id,
        function (error) {
          if (error) {
            return callback(error)
          }
          console.log('IMPORTED', project_id)
          callback()
        }
      )
    })
  })
}

const backfillProjects = function (from_project_id, callback) {
  const query = {
    'overleaf.id': { $exists: true }
  }
  if (from_project_id) {
    query._id = { $gte: ObjectId(from_project_id) }
  }
  db.projects.find(query, {
    overleaf: 1,
    owner_ref: 1
  }).sort({ _id: 1 }, function (error, projects) {
    if (error) {
      return callback(error)
    }
    console.log('PROJECT COUNT', projects.length)
    async.mapSeries(projects, function (project, cb) {
      backfillLabels(project, function(error) {
        if (error) {
          console.error('ERROR', error)
        }
        cb()
      })
    }, function (error) {
      console.log('FINISHED!')
      callback()
    })
  })
}

const argv = minimist(process.argv.slice(2))
backfillProjects(argv.from_project_id, function(error) {
  if (error) {
    throw error
  }
  process.exit()
})
