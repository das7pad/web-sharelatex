AuthorizationMiddlewear = require('../Authorization/AuthorizationMiddlewear')
AuthenticationController = require('../Authentication/AuthenticationController')
ProjectUploadController = require "./ProjectUploadController"
RateLimiterMiddlewear = require('../Security/RateLimiterMiddlewear')
Settings = require('settings-sharelatex')
multer = require('multer')

# handle file uploads with maximum file size of 50MB
upload = multer(dest: Settings.path.uploadFolder, limits: fileSize: 50*1024*1024)

module.exports =
	apply: (webRouter, apiRouter) ->
		webRouter.post '/project/new/upload',
			AuthenticationController.requireLogin(),
			upload.single('qqfile'),
			ProjectUploadController.uploadProject

		webRouter.post '/Project/:Project_id/upload',
			RateLimiterMiddlewear.rateLimit({
				endpointName: "file-upload"
				params: ["Project_id"]
				maxRequests: 200
				timeInterval: 60 * 30
			}),
			AuthenticationController.requireLogin(),
			AuthorizationMiddlewear.ensureUserCanWriteProjectContent,
			upload.single('qqfile'),
			ProjectUploadController.uploadFile
