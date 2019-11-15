/* eslint-disable
    handle-callback-err
*/
const mongoose = require('mongoose')
const Settings = require('settings-sharelatex')
const { TeamInviteSchema } = require('./TeamInvite')

const { Schema } = mongoose
const { ObjectId } = Schema

const SubscriptionSchema = new Schema({
  admin_id: {
    type: ObjectId,
    ref: 'User',
    index: { unique: true, dropDups: true }
  },
  manager_ids: {
    type: [ObjectId],
    ref: 'User',
    required: true,
    unique: true,
    validate: function(managers) {
      // require at least one manager
      return !!managers.length
    }
  },
  member_ids: [{ type: ObjectId, ref: 'User' }],
  invited_emails: [String],
  teamInvites: [TeamInviteSchema],
  recurlySubscription_id: String,
  teamName: { type: String },
  teamNotice: { type: String },
  planCode: { type: String },
  groupPlan: { type: Boolean, default: false },
  membersLimit: { type: Number, default: 0 },
  customAccount: Boolean,
  overleaf: {
    id: {
      type: Number,
      index: {
        unique: true,
        partialFilterExpression: { 'overleaf.id': { $exists: true } }
      }
    }
  }
})

SubscriptionSchema.statics.findAndModify = function(query, update, callback) {
  const self = this
  return this.update(query, update, () => self.findOne(query, callback))
}

// Subscriptions have no v1 data to fetch
SubscriptionSchema.method('fetchV1Data', function(callback) {
  if (callback == null) {
    callback = function(error, subscription) {}
  }
  return callback(null, this)
})

const conn = mongoose.createConnection(Settings.mongo.url, {
  server: { poolSize: Settings.mongo.poolSize || 10 },
  config: { autoIndex: false }
})

const Subscription = conn.model('Subscription', SubscriptionSchema)

mongoose.model('Subscription', SubscriptionSchema)
exports.Subscription = Subscription
exports.SubscriptionSchema = SubscriptionSchema
