request = require "request"
settings = require "settings-sharelatex"
logger = require "logger-sharelatex"
{User} = require "../../../../../app/js/models/User"
{UserStub} = require "../../../../../app/js/models/UserStub"
UserCreator = require "../../../../../app/js/Features/User/UserCreator"
CollaboratorsHandler = require "../../../../../app/js/Features/Collaborators/CollaboratorsHandler"
SubscriptionGroupHandler = require "../../../../../app/js/Features/Subscription/SubscriptionGroupHandler"
TagsHandler = require "../../../../../app/js/Features/Tags/TagsHandler"
UserGetter = require "../../../../../app/js/Features/User/UserGetter"
UserUpdater = require "../../../../../app/js/Features/User/UserUpdater"
InstitutionsAPI = require "../../../../../app/js/Features/Institutions/InstitutionsAPI"
async = require 'async'
Errors = require "../../../../../app/js/Features/Errors/Errors"

# When we import a project, it may refer to collaborators which
# have not yet linked their account the beta system. In that case,
# we create a UserStub, so that we can insert an id into the project
# collaborators array, which is linked to an OL user id by the UserStub.
# When that user eventually migrates their account to the beta, we
# check if they have a UserStub, and if so make sure their beta User
# is created with that same id, and the UserStub deleted. Their user
# will then be linked to all the right things (projects, history, chat, etc)
# without having to modify each of this individually.
module.exports = UserMapper =
	getCanonicalEmail: (email) ->
		return email.trim().toLowerCase()

	# Given an OL user id, find the corresponding SL User id or UserStub id.
	# If no User or UserStub exists, create a UserStub. This guarantees to
	# return a SL id that will be used for this OL user forever going forwards.
	getSlIdFromOlUser: (ol_user, callback = (error, sl_user_id) ->) ->
		if !ol_user?.id?
			return callback(new Error('no ol user id provided'))
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

	getOlUserStub: (ol_user_id, callback = (error, user_stub) ->) ->
		UserStub.findOne { "overleaf.id": ol_user_id }, callback

	removeOlUserStub: (ol_user_id, callback = (error) ->) ->
		UserStub.remove { "overleaf.id": ol_user_id }, callback

	# Create an SL User object for the OL user, with the same ID as was
	# used for the UserStub if it exists.
	createSlUser: (ol_user, callback = (error, sl_user) ->) ->
		email = UserMapper.getCanonicalEmail(ol_user.email)
		UserMapper.getOlUserStub ol_user.id, (error, user_stub) ->
			return callback(error) if error?
			new_user = {
				overleaf: {
					id: ol_user.id
				},
				email: email,
				ace:
					theme: 'overleaf'
			}
			if user_stub?
				new_user._id = user_stub._id
			UserMapper._removeDuplicateEmailsAndCreateNewUser new_user, (error, user) ->
				return callback(error) if error?
				UserMapper.removeOlUserStub ol_user.id, (error) ->
					return callback(error) if error?
					UserMapper._addEmails user, ol_user, (error) ->
						return callback(error) if error?
						callback(null, user)

	mergeWithSlUser: (sl_user_id, ol_user, callback = (error, sl_user) ->) ->
		UserMapper.getOlUserStub ol_user.id, (error, user_stub) ->
			return callback(error) if error?
			User.findOne {_id: sl_user_id}, (error, user) ->
				return callback(error) if error?
				if user.email != UserMapper.getCanonicalEmail(ol_user.email)
					return callback(new Error('expected OL and SL account emails to match'))
				user.overleaf = {
					id: ol_user.id
				}
				user.save (error) ->
					return callback(error) if error?
					UserMapper._updateUserStubReferences ol_user, user_stub?._id, sl_user_id, (error) ->
						return callback(error) if error?
						UserMapper._addEmails user, ol_user, (error) ->
							return callback(error) if error?
							callback(null, user)

	_updateUserStubReferences: (olUser, userStubId, slUserId, callback = (error) ->) ->
		return callback() unless userStubId?
		CollaboratorsHandler.transferProjects userStubId, slUserId, (error) ->
			return callback(error) if error?
			SubscriptionGroupHandler.replaceUserReferencesInGroups userStubId, slUserId, (error) ->
				return callback(error) if error?
				UserMapper._transferLabels userStubId, slUserId, (error) ->
					return callback(error) if error?
					TagsHandler.updateTagUserIds userStubId, slUserId, (error) ->
						return callback(error) if error?
						UserMapper.removeOlUserStub olUser.id, callback

	_transferLabels: (fromUserId, toUserId, callback = (error) ->) ->
		request.post {
			url: "#{settings.apis.project_history.url}/user/#{fromUserId}/labels/transfer/#{toUserId}"
		}, (error, response) ->
			return callback(error) if error?

			if 200 <= response.statusCode < 300
				callback()
			else
				error = new Error("project-history returned non-success code: #{response.statusCode}")
				error.statusCode = response.statusCode
				callback error

	_addEmails: (user, ol_user, callback = (error) ->) ->
		ol_user_email = UserMapper.getCanonicalEmail(ol_user.email)
		affiliations = ol_user.affiliations or []
		mainEmailIsAffiliation = affiliations.some (emailData) ->
			emailData.email == ol_user_email
		unless mainEmailIsAffiliation
			affiliations.push { email: ol_user_email, confirmed_at: ol_user.confirmed_at }
		async.each(
			affiliations,
			((affiliation, cb) -> UserMapper._addEmail user, affiliation, cb),
			callback
		)

	_addEmail: (user, affiliation, callback) ->
		{ email, university, department, role, inferred } = affiliation
		options = {}
		options.university = university unless inferred
		options.role = role if role?
		options.department = department if department?

		UserMapper._addEmailOrAffiliation user, email, options, (error) ->
			if error?
				if error instanceof Errors.EmailExistsError
					return callback()
				else
					logger.err user: user, email: email, "Couldn't add email on merge"
					return callback(error)
			return callback(null) unless affiliation.confirmed_at
			UserUpdater.confirmEmail user._id, email, new Date(affiliation.confirmed_at), callback

	_addEmailOrAffiliation: (user, email, options, callback) ->
		emailExists = user.emails.some (emailData) -> emailData.email == email
		if emailExists # only create the affiliation
			InstitutionsAPI.addAffiliation user._id, email, options, callback
		else # add the email and create the affiliation
			UserUpdater.addEmailAddress user._id, email, options, callback

	# when creating a new user from a OL user, an existing secondary email
	# matching the OL user's primary email could already exist in the DB (only the
	# primary email is checked to decide whether the OL user is new or should be
	# merged). In that case we want to drop the secondary email first.
	_removeDuplicateEmailsAndCreateNewUser: (new_user, callback = (error, user) ->) ->
		UserMapper._removeDuplicateEmails new_user.email, (error) ->
			return callback(error) if error?
			UserCreator.createNewUser new_user, skip_affiliation: true, callback

	_removeDuplicateEmails: (email, callback = (error) ->) ->
		UserGetter.getUserByAnyEmail email, {}, (error, user) ->
			return callback(error) if error?
			return callback() unless user?
			UserUpdater.removeEmailAddress user._id, email, callback
