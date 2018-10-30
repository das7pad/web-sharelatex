UserMembershipAuthorization = require './UserMembershipAuthorization'
UserMembershipController = require './UserMembershipController'
SubscriptionGroupController = require '../Subscription/SubscriptionGroupController'
TeamInvitesController = require '../Subscription/TeamInvitesController'

module.exports =
	apply: (webRouter) ->
		webRouter.get '/manage/groups/:id/members',
			UserMembershipAuthorization.requireGroupAccess,
			UserMembershipController.index
		webRouter.post '/manage/groups/:id/invites',
			UserMembershipAuthorization.requireGroupAccess,
			TeamInvitesController.createInvite
		webRouter.delete '/manage/groups/:id/user/:user_id',
			UserMembershipAuthorization.requireGroupAccess,
			SubscriptionGroupController.removeUserFromGroup
		webRouter.delete '/manage/groups/:id/invites/:email',
			UserMembershipAuthorization.requireGroupAccess,
			TeamInvitesController.revokeInvite
		webRouter.get '/manage/groups/:id/members/export',
			UserMembershipAuthorization.requireGroupAccess,
			UserMembershipController.exportCsv


		regularEntitites =
			groups: 'requireGroupManagersAccess'
			institutions: 'requireInstitutionAccess'
		for pathName, authorizationFunctionName of regularEntitites
			do (pathName, authorizationFunctionName) ->
				webRouter.get "/manage/#{pathName}/:id/managers",
					UserMembershipAuthorization[authorizationFunctionName],
					UserMembershipController.index

				webRouter.post "/manage/#{pathName}/:id/managers",
					UserMembershipAuthorization[authorizationFunctionName],
					UserMembershipController.add

				webRouter.delete "/manage/#{pathName}/:id/managers/:userId",
					UserMembershipAuthorization[authorizationFunctionName],
					UserMembershipController.remove
