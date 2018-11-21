errorType = require 'overleaf-error-type'


Errors = {}


Errors.FeatureNotAvailable = errorType.define('FeatureNotAvailable')
Errors.ProjectNotCompatibleError = errorType.define('ProjectNotCompatibleError')
Errors.OutOfDateError = errorType.define('OutOfDateError')
Errors.InvalidFileError = errorType.define('InvalidFileError')


module.exports = Errors
