{User} = require "../../../../../app/js/models/User"
{UserStub} = require "../../../../../app/js/models/UserStub"

module.exports = UserMapper =
	getSlIdFromOlUser: (ol_user, callback = (error, sl_user_id) ->) ->
		User.findOne { "overleaf.id": ol_user.id }, { _id: 1 }, (error, user) ->
			return callback(error) if error?
			return callback(null, user._id) if user?
			UserStub.update {
				"overleaf.id": ol_user.id
			}, {
				email: ol_user.email
			}, {
				upsert:true
			}, (error, user_stub) ->
				return callback(error) if error?
				UserStub.findOne { "overleaf.id": ol_user.id }, { _id: 1 }, (error, user_stub) ->
					return callback(error) if error?
					return callback(null, user_stub._id)
