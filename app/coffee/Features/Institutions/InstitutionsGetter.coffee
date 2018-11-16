UserGetter = require '../User/UserGetter'
UserMembershipHandler = require "../UserMembership/UserMembershipHandler"
logger = require 'logger-sharelatex'

module.exports = InstitutionsGetter =
	getConfirmedInstitutions: (userId, callback = (error, institutions) ->) ->
		UserGetter.getUserFullEmails userId, (error, emailsData) ->
			return callback error if error?

			confirmedInstitutions = emailsData.filter (emailData) -> 
				emailData.confirmedAt? and emailData.affiliation?.institution?.confirmed
			.map (emailData) ->
				emailData.affiliation?.institution

			callback(null, confirmedInstitutions)

	getManagedInstitutions: (user_id, callback = (error, managedInstitutions) ->) ->
		UserMembershipHandler.getEntitiesByUser 'institution', user_id, callback
