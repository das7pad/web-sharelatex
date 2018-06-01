logger = require "logger-sharelatex"
metrics = require "metrics-sharelatex"
_ = require "underscore"
UserGetter = require "../../../../app/js/Features/User/UserGetter"
settings = require("settings-sharelatex")
LimitationsManager = require("../../../../app/js/Features/Subscription/LimitationsManager")
crypto = require('crypto')

module.exports = SupportDetailsManager =
		

	_getDetails: (userEmail, callback)->
		UserGetter.getUserByMainEmail userEmail, { _id:1, first_name:1, last_name:1, loginCount:1, signUpDate:1, role:1, institution:1, features:1}, (err, user) ->
			if err?
				return callback(err)
			if !user?
				return callback(null, {})
			LimitationsManager.userHasSubscriptionOrIsGroupMember user, (err, hasSubOrIsGroupMember, subscription)->
				if err?
					return callback(err)
				user.hasSubOrIsGroupMember = hasSubOrIsGroupMember
				if hasSubOrIsGroupMember
					user.recurlySubscription_id = subscription?.recurlySubscription_id
					user.planCode = subscription?.planCode
				if subscription?.recurlySubscription_id?
					user.recurly_url = "https://sharelatex.recurly.com/accounts/#{user._id}"
				user.admin_url = "#{settings.siteUrl}/admin/user/#{user._id}"
				user.user_id = user._id
				callback err, user



