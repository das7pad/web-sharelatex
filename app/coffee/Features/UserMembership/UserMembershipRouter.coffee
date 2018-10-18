UserMembershipAuthorization = require './UserMembershipAuthorization'
UserMembershipController = require './UserMembershipController'

module.exports =
	apply: (webRouter) ->
		webRouter.get '/manage/groups/:id/members',
			UserMembershipAuthorization.requireEntityAccess('group'),
			(req, res, next) -> UserMembershipController.index('group', req, res, next)


		regularEntitites =
			groups: 'groupManagers'
			institutions: 'institution'
		for pathName, entityName of regularEntitites
			do (pathName, entityName) ->
				webRouter.get "/manage/#{pathName}/:id/managers",
					UserMembershipAuthorization.requireEntityAccess(entityName),
					(req, res, next) -> UserMembershipController.index(entityName, req, res, next)

				webRouter.post "/manage/#{pathName}/:id/managers",
					UserMembershipAuthorization.requireEntityAccess(entityName),
					(req, res, next) -> UserMembershipController.add(entityName, req, res, next)

				webRouter.delete "/manage/#{pathName}/:id/managers/:userId",
					UserMembershipAuthorization.requireEntityAccess(entityName),
					(req, res, next) -> UserMembershipController.remove(entityName, req, res, next)
