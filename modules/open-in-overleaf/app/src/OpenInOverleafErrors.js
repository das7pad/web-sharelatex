/* eslint-disable
    no-proto,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
let OpenInOverleafErrors
var MissingParametersError = function(message) {
  const error = new Error(message)
  error.name = 'MissingParametersError'
  error.__proto__ = MissingParametersError.prototype
  return error
}
MissingParametersError.prototype.__proto__ = Error.prototype

var AmbiguousParametersError = function(message) {
  const error = new Error(message)
  error.name = 'AmbiguousParametersError'
  error.__proto__ = AmbiguousParametersError.prototype
  return error
}
AmbiguousParametersError.prototype.__proto__ = Error.prototype

var ZipExtractError = function(message) {
  const error = new Error(message)
  error.name = 'ZipExtractError'
  error.__proto__ = ZipExtractError.prototype
  return error
}
ZipExtractError.prototype.__proto__ = Error.prototype

var InvalidFileTypeError = function(message) {
  const error = new Error(message)
  error.name = 'InvalidFileTypeError'
  error.__proto__ = InvalidFileTypeError.prototype
  return error
}
InvalidFileTypeError.prototype.__proto__ = Error.prototype

var InvalidUriError = function(message) {
  const error = new Error(message)
  error.name = 'InvalidUriError'
  error.__proto__ = InvalidUriError.prototype
  return error
}
InvalidUriError.prototype.__proto__ = Error.prototype

var PublisherNotFoundError = function(message) {
  const error = new Error(message)
  error.name = 'PublisherNotFoundError'
  error.__proto__ = PublisherNotFoundError.prototype
  return error
}
PublisherNotFoundError.prototype.__proto__ = Error.prototype

var TemplateNotFoundError = function(message) {
  const error = new Error(message)
  error.name = 'TemplateNotFoundError'
  error.__proto__ = TemplateNotFoundError.prototype
  return error
}
TemplateNotFoundError.prototype.__proto__ = Error.prototype

var ConversionNotFoundError = function(message) {
  const error = new Error(message)
  error.name = 'ConversionNotFoundError'
  error.__proto__ = ConversionNotFoundError.prototype
  return error
}
ConversionNotFoundError.prototype.__proto__ = Error.prototype

module.exports = OpenInOverleafErrors = {
  MissingParametersError,
  AmbiguousParametersError,
  ZipExtractError,
  InvalidFileTypeError,
  InvalidUriError,
  PublisherNotFoundError,
  TemplateNotFoundError,
  ConversionNotFoundError
}
