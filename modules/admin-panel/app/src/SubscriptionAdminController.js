/* eslint-disable
    camelcase,
    max-len,
    no-undef,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let SubscriptionAdminController
const logger = require('logger-sharelatex')
const metrics = require('metrics-sharelatex')
const _ = require('underscore')
const Path = require('path')
const UserGetter = require('../../../../app/src/Features/User/UserGetter')
const UserAdminController = require('./UserAdminController')
const SubscriptionLocator = require('../../../../app/src/Features/Subscription/SubscriptionLocator')
const SubscriptionUpdater = require('../../../../app/src/Features/Subscription/SubscriptionUpdater')
const FeaturesUpdater = require('../../../../app/src/Features/Subscription/FeaturesUpdater')
const { Subscription } = require('../../../../app/src/models/Subscription')
const ErrorController = require('../../../../app/src/Features/Errors/ErrorController')
const async = require('async')

module.exports = SubscriptionAdminController = {
  show(req, res, next) {
    // The user_id isn't used in the look up, it just provides a nice
    // breadcrumb trail of where we came from for navigation
    const { subscription_id, user_id } = req.params
    logger.log({ subscription_id }, 'getting admin request for subscription')
    return SubscriptionLocator.getSubscription(subscription_id, function (
      err,
      subscription
    ) {
      if (err != null) {
        return next(err)
      }
      if (subscription == null) {
        return ErrorController.notFound(req, res)
      }
      return UserGetter.getUsers(
        subscription.member_ids,
        { email: 1 },
        function (err, members) {
          if (err != null) {
            return next(err)
          }
          const managerIds = subscription.manager_ids || []
          return UserGetter.getUsers(managerIds, { email: 1 }, function (
            err,
            managers
          ) {
            if (err != null) {
              return next(err)
            }
            return res.render(
              Path.resolve(__dirname, '../views/subscription/show'),
              { subscription, user_id, members, managers }
            )
          })
        }
      )
    })
  },

  ALLOWED_ATTRIBUTES: [
    'recurlySubscription_id',
    'teamName',
    'teamNotice',
    'planCode',
    'membersLimit',
    'groupPlan',
    'customAccount'
  ],
  BOOLEAN_ATTRIBUTES: ['groupPlan', 'customAccount'],
  update(req, res, next) {
    const { subscription_id, user_id } = req.params
    const update = UserAdminController._reqToMongoUpdate(
      req.body,
      SubscriptionAdminController.ALLOWED_ATTRIBUTES,
      SubscriptionAdminController.BOOLEAN_ATTRIBUTES
    )
    logger.log(
      { subscription_id, update },
      'updating subscription via admin panel'
    )
    return Subscription.findAndModify(
      { _id: subscription_id },
      { $set: update },
      function (error, subscription) {
        if (error != null) {
          return next(error)
        }
        return async.eachSeries(
          [subscription.admin_id].concat(subscription.member_ids),
          (user_id, callback) =>
            FeaturesUpdater.refreshFeatures(user_id, true, callback),
          function (error) {
            if (error != null) {
              return next(error)
            }
            return res.sendStatus(204)
          }
        )
      }
    )
  },

  new(req, res, next) {
    return res.render(Path.resolve(__dirname, '../views/subscription/new'), {
      admin_id: req.params.user_id
    })
  },

  create(req, res, next) {
    const update = UserAdminController._reqToMongoUpdate(
      req.body,
      SubscriptionAdminController.ALLOWED_ATTRIBUTES,
      SubscriptionAdminController.BOOLEAN_ATTRIBUTES
    )
    update.admin_id = req.body.admin_id
    update.manager_ids = [req.body.admin_id]
    logger.log({ update }, 'creating subscription via admin panel')
    return new Subscription(update).save(function (error, subscription) {
      if (error != null) {
        return next(error)
      }
      return res.json({ subscription })
    })
  },

  delete(req, res) {
    const { subscription_id } = req.params
    logger.log(
      { subscription_id },
      'received admin request to delete subscription'
    )
    return SubscriptionUpdater.deleteSubscription(subscription_id, function (
      err
    ) {
      if (err != null) {
        return next(err)
      }
      return res.sendStatus(204)
    })
  }
}
