/* eslint-disable
    max-len,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
let OpenInOverleafErrorController
const logger = require('logger-sharelatex')
const Path = require('path')
const OpenInOverleafErrors = require('./OpenInOverleafErrors')
const Errors = require('../../../../app/js/Features/Errors/Errors')

module.exports = OpenInOverleafErrorController = {
  handleError(err, req, res, next) {
    const e = OpenInOverleafErrorController._statusAndTranslatableTextForError(
      err,
      req
    )
    const errorText = req.i18n.translate(e.text)

    if (
      req.xhr ||
      (req.headers.accept != null
        ? req.headers.accept.indexOf('json')
        : undefined) > -1
    ) {
      res.setHeader('Content-Type', 'application/json')
      return res.status(e.status).send(JSON.stringify({ error: errorText }))
    } else {
      return res
        .status(e.status)
        .render(Path.resolve(__dirname, '../views/gateway'), {
          error: errorText
        })
    }
  },

  _statusAndTranslatableTextForError(error, req) {
    if (error instanceof OpenInOverleafErrors.MissingParametersError) {
      logger.warn({ err: error, url: req.url }, 'missing parameters error')
      return { status: 400, text: 'the_required_parameters_were_not_supplied' }
    }
    if (error instanceof OpenInOverleafErrors.AmbiguousParametersError) {
      logger.warn({ err: error, url: req.url }, 'ambiguous parameters error')
      return {
        status: 400,
        text: 'more_than_one_kind_of_snippet_was_requested'
      }
    }
    if (error instanceof OpenInOverleafErrors.ZipExtractError) {
      logger.warn({ err: error, url: req.url }, 'zip extract error')
      return { status: 422, text: 'unable_to_extract_the_supplied_zip_file' }
    }
    if (error instanceof OpenInOverleafErrors.InvalidFileTypeError) {
      logger.warn({ err: error, url: req.url }, 'invalid file type error')
      return {
        status: 422,
        text: 'the_file_supplied_is_of_an_unsupported_type'
      }
    }
    if (error instanceof OpenInOverleafErrors.InvalidUriError) {
      logger.warn({ err: error, url: req.url }, 'invalid file type error')
      return { status: 422, text: 'the_supplied_uri_is_invalid' }
    }
    if (error instanceof OpenInOverleafErrors.PublisherNotFoundError) {
      logger.warn({ err: error, url: req.url }, 'publisher not found error')
      return { status: 404, text: 'the_requested_publisher_was_not_found' }
    }
    if (error instanceof OpenInOverleafErrors.TemplateNotFoundError) {
      logger.warn({ err: error, url: req.url }, 'template not found error')
      return { status: 404, text: 'the_requested_template_was_not_found' }
    }
    if (error instanceof OpenInOverleafErrors.ConversionNotFoundError) {
      logger.warn({ err: error, url: req.url }, 'conversion not found error')
      return { status: 404, text: 'the_requested_conversion_job_was_not_found' }
    }
    if (error instanceof Errors.NotFoundError) {
      logger.warn({ err: error, url: req.url }, 'not found error')
      return { status: 404, text: 'not_found_error_from_the_supplied_url' }
    }
    if (error instanceof Errors.TooManyRequestsError) {
      logger.warn({ err: error, url: req.url }, 'too many requests error')
      return { status: 429, text: 'too_many_requests' }
    }
    if (error instanceof Errors.InvalidError) {
      logger.warn({ err: error, url: req.url }, 'invalid error')
      return { status: 400, text: 'the_supplied_parameters_were_invalid' }
    }
    if (error instanceof Errors.InvalidNameError) {
      logger.warn({ err: error, url: req.url }, 'invalid name error')
      return { status: 400, text: error.message }
    }

    logger.error(
      { err: error, url: req.url, method: req.method },
      'unhandled error'
    )
    return {
      status: 500,
      text: 'sorry_something_went_wrong_opening_the_document_please_try_again'
    }
  }
}
