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
const AsyncFormHelper = require('../Helpers/AsyncFormHelper')
const AuthenticationController = require('../Authentication/AuthenticationController')
const UserMembershipHandler = require('./UserMembershipHandler')
const Errors = require('../Errors/Errors')
const EmailHelper = require('../Helpers/EmailHelper')
const CSVParser = require('json2csv').Parser

module.exports = {
  index(req, res, next) {
    const { entity, entityConfig } = req
    return entity.fetchV1Data(function (error, entity) {
      if (error != null) {
        return next(error)
      }
      return UserMembershipHandler.getUsers(
        entity,
        entityConfig,
        function (error, users) {
          let entityName
          if (error != null) {
            return next(error)
          }
          const entityPrimaryKey = entity[
            entityConfig.fields.primaryKey
          ].toString()
          if (entityConfig.fields.name) {
            entityName = entity[entityConfig.fields.name]
          }
          return res.render('user_membership/index', {
            name: entityName,
            users,
            groupSize: entityConfig.hasMembersLimit
              ? entity.membersLimit
              : undefined,
            translations: entityConfig.translations,
            paths: entityConfig.pathsFor(entityPrimaryKey)
          })
        }
      )
    })
  },

  add(req, res, next) {
    const { entity, entityConfig } = req
    const email = EmailHelper.parseEmail(req.body.email)
    if (email == null) {
      return res.status(400).json({
        error: {
          code: 'invalid_email',
          message: req.i18n.translate('invalid_email')
        }
      })
    }

    if (entityConfig.readOnly) {
      return next(new Errors.NotFoundError('Cannot add users to entity'))
    }

    return UserMembershipHandler.addUser(
      entity,
      entityConfig,
      email,
      function (error, user) {
        if (error != null ? error.alreadyAdded : undefined) {
          return res.status(400).json({
            error: {
              code: 'user_already_added',
              message: req.i18n.translate('user_already_added')
            }
          })
        }
        if (error != null ? error.userNotFound : undefined) {
          return res.status(404).json({
            error: {
              code: 'user_not_found',
              message: req.i18n.translate('user_not_found')
            }
          })
        }
        if (error != null) {
          return next(error)
        }
        return res.json({ user })
      }
    )
  },

  remove(req, res, next) {
    const { entity, entityConfig } = req
    const { userId } = req.params

    if (entityConfig.readOnly) {
      return next(new Errors.NotFoundError('Cannot remove users from entity'))
    }

    const loggedInUserId = AuthenticationController.getLoggedInUserId(req)
    if (loggedInUserId === userId) {
      return res.status(400).json({
        error: {
          code: 'managers_cannot_remove_self',
          message: req.i18n.translate('managers_cannot_remove_self')
        }
      })
    }

    return UserMembershipHandler.removeUser(
      entity,
      entityConfig,
      userId,
      function (error, user) {
        if (error != null ? error.isAdmin : undefined) {
          return res.status(400).json({
            error: {
              code: 'managers_cannot_remove_admin',
              message: req.i18n.translate('managers_cannot_remove_admin')
            }
          })
        }
        if (error != null) {
          return next(error)
        }
        return res.sendStatus(200)
      }
    )
  },

  exportCsv(req, res, next) {
    const { entity, entityConfig } = req
    const fields = ['email', 'last_logged_in_at']

    return UserMembershipHandler.getUsers(
      entity,
      entityConfig,
      function (error, users) {
        if (error != null) {
          return next(error)
        }
        const csvParser = new CSVParser({ fields })
        res.attachment('Group.csv')
        return res.send(csvParser.parse(users))
      }
    )
  },

  new(req, res, next) {
    return res.render('user_membership/new', {
      entityName: req.params.name,
      entityId: req.params.id
    })
  },

  create(req, res, next) {
    const entityId = req.params.id
    const entityConfig = req.entityConfig

    return UserMembershipHandler.createEntity(
      entityId,
      entityConfig,
      function (error, entity) {
        if (error != null) {
          return next(error)
        }
        AsyncFormHelper.redirect(
          req,
          res,
          entityConfig.pathsFor(entityId).index
        )
      }
    )
  }
}
