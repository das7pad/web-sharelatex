const EmailHelper = require('../Helpers/EmailHelper')
const EmailHandler = require('../Email/EmailHandler')
const OneTimeTokenHandler = require('../Security/OneTimeTokenHandler')
const settings = require('@overleaf/settings')
const Errors = require('../Errors/Errors')
const UserUpdater = require('./UserUpdater')
const UserGetter = require('./UserGetter')
const { promisify } = require('util')

// Reject email confirmation tokens after 90 days
const TOKEN_EXPIRY_IN_S = 90 * 24 * 60 * 60

function sendConfirmationEmail(userId, email, emailTemplate, callback) {
  if (arguments.length === 3) {
    callback = emailTemplate
    emailTemplate = 'confirmEmail'
  }

  // when force-migrating accounts to v2 from v1, we don't want to send confirmation messages -
  // setting this env var allows us to turn this behaviour off
  if (process.env.SHARELATEX_NO_CONFIRMATION_MESSAGES != null) {
    return callback(null)
  }

  email = EmailHelper.parseEmail(email)
  if (!email) {
    return callback(new Error('invalid email'))
  }
  const data = { user_id: userId, email }
  OneTimeTokenHandler.getNewToken(
    'email_confirmation',
    data,
    { expiresIn: TOKEN_EXPIRY_IN_S },
    function (err, token) {
      if (err) {
        return callback(err)
      }
      const emailOptions = {
        to: email,
        confirmEmailUrl: `${settings.siteUrl}/user/emails/confirm?token=${token}`,
        sendingUser_id: userId
      }
      EmailHandler.sendEmail(emailTemplate, emailOptions, callback)
    }
  )
}

const UserEmailsConfirmationHandler = {
  sendConfirmationEmail,

  confirmEmailFromToken(token, callback) {
    OneTimeTokenHandler.getValueFromTokenAndExpire(
      'email_confirmation',
      token,
      function (error, data) {
        if (error) {
          return callback(error)
        }
        if (!data) {
          return callback(new Errors.NotFoundError('no token found'))
        }
        const userId = data.user_id
        const email = data.email

        if (!userId || email !== EmailHelper.parseEmail(email)) {
          return callback(new Errors.NotFoundError('invalid data'))
        }
        UserGetter.getUser(userId, {}, function (error, user) {
          if (error) {
            return callback(error)
          }
          if (!user) {
            return callback(new Errors.NotFoundError('user not found'))
          }
          const emailExists = user.emails.some(
            emailData => emailData.email === email
          )
          if (!emailExists) {
            return callback(new Errors.NotFoundError('email missing for user'))
          }
          UserUpdater.confirmEmail(userId, email, callback)
        })
      }
    )
  }
}

UserEmailsConfirmationHandler.promises = {
  sendConfirmationEmail: promisify(sendConfirmationEmail)
}

module.exports = UserEmailsConfirmationHandler
