const _ = require('underscore')
const settings = require('settings-sharelatex')
const marked = require('marked')
const moment = require('moment')
const EmailMessageHelper = require('./EmailMessageHelper')
const StringHelper = require('../Helpers/StringHelper')
const BaseWithHeaderEmailLayout = require('./Layouts/BaseWithHeaderEmailLayout')
const SpamSafe = require('./SpamSafe')
const SingleCTAEmailBody = require('./Bodies/SingleCTAEmailBody')
const NoCTAEmailBody = require(`./Bodies/NoCTAEmailBody`)

function CTAEmailTemplate(content) {
  if (content.greeting == null) {
    content.greeting = () => 'Hi,'
  }
  if (content.secondaryMessage == null) {
    content.secondaryMessage = () => ''
  }
  return {
    subject(opts) {
      return content.subject(opts)
    },
    layout: BaseWithHeaderEmailLayout,
    plainTextTemplate(opts) {
      return `\
${content.greeting(opts)}

${content.message(opts).trim()}

${content.ctaText(opts)}: ${content.ctaURL(opts)}

${(typeof content.secondaryMessage === 'function'
  ? content.secondaryMessage(opts).trim()
  : undefined) || ''}

Regards,
The ${settings.appName} Team - ${settings.siteUrl}\
`
    },
    compiledTemplate(opts) {
      return SingleCTAEmailBody({
        title:
          typeof content.title === 'function' ? content.title(opts) : undefined,
        greeting: content.greeting(opts),
        message: marked(content.message(opts).trim()),
        secondaryMessage: marked(content.secondaryMessage(opts).trim()),
        ctaText: content.ctaText(opts),
        ctaURL: content.ctaURL(opts),
        gmailGoToAction:
          typeof content.gmailGoToAction === 'function'
            ? content.gmailGoToAction(opts)
            : undefined,
        StringHelper
      })
    }
  }
}

function NoCTAEmailTemplate(content) {
  if (content.greeting == null) {
    content.greeting = () => 'Hi,'
  }
  if (!content.message) {
    throw new Error('missing message')
  }
  return {
    subject(opts) {
      return content.subject(opts)
    },
    layout: BaseWithHeaderEmailLayout,
    plainTextTemplate(opts) {
      return `\
${content.greeting(opts)}

${content.message(opts, true).join('\r\n\r\n')}
  
Regards,
The ${settings.appName} Team - ${settings.siteUrl}\
`
    },
    compiledTemplate(opts) {
      return NoCTAEmailBody({
        title:
          typeof content.title === 'function' ? content.title(opts) : undefined,
        greeting: content.greeting(opts),
        message: content.message(opts),
        StringHelper
      })
    }
  }
}

function buildEmail(templateName, opts) {
  const template = templates[templateName]
  opts.siteUrl = settings.siteUrl
  opts.body = template.compiledTemplate(opts)
  if (
    settings.email &&
    settings.email.template &&
    settings.email.template.customFooter
  ) {
    opts.body += settings.email.template.customFooter
  }
  return {
    subject: template.subject(opts),
    html: template.layout(opts),
    text: template.plainTextTemplate && template.plainTextTemplate(opts)
  }
}

const templates = {}

templates.registered = CTAEmailTemplate({
  subject() {
    return `Activate your ${settings.appName} Account`
  },
  message(opts) {
    return `\
Congratulations, you've just had an account created for you on ${
      settings.appName
    } with the email address '${_.escape(opts.to)}'.

Click here to set your password and log in:\
`
  },
  secondaryMessage() {
    return `If you have any questions or problems, please contact ${settings.adminEmail}`
  },
  ctaText() {
    return 'Set password'
  },
  ctaURL(opts) {
    return opts.setNewPasswordUrl
  }
})

templates.canceledSubscription = CTAEmailTemplate({
  subject() {
    return `${settings.appName} thoughts`
  },
  message() {
    return `\
We are sorry to see you cancelled your ${settings.appName} premium subscription. Would you mind giving us some feedback on what the site is lacking at the moment via this quick survey?\
`
  },
  secondaryMessage() {
    return 'Thank you in advance!'
  },
  ctaText() {
    return 'Leave Feedback'
  },
  ctaURL(opts) {
    return 'https://docs.google.com/forms/d/e/1FAIpQLSfa7z_s-cucRRXm70N4jEcSbFsZeb0yuKThHGQL8ySEaQzF0Q/viewform?usp=sf_link'
  }
})

templates.reactivatedSubscription = CTAEmailTemplate({
  subject() {
    return `Subscription Reactivated - ${settings.appName}`
  },
  message(opts) {
    return `\
Your subscription was reactivated successfully.\
`
  },
  ctaText() {
    return 'View Subscription Dashboard'
  },
  ctaURL(opts) {
    return `${settings.siteUrl}/user/subscription`
  }
})

templates.passwordResetRequested = CTAEmailTemplate({
  subject() {
    return `Password Reset - ${settings.appName}`
  },
  title() {
    return 'Password Reset'
  },
  message() {
    return `We got a request to reset your ${settings.appName} password.`
  },
  secondaryMessage() {
    return `\
If you ignore this message, your password won't be changed.

If you didn't request a password reset, let us know.\
`
  },
  ctaText() {
    return 'Reset password'
  },
  ctaURL(opts) {
    return opts.setNewPasswordUrl
  }
})

templates.confirmEmail = CTAEmailTemplate({
  subject() {
    return `Confirm Email - ${settings.appName}`
  },
  title() {
    return 'Confirm Email'
  },
  message() {
    return `Please confirm your email on ${settings.appName}.`
  },
  ctaText() {
    return 'Confirm Email'
  },
  ctaURL(opts) {
    return opts.confirmEmailUrl
  }
})

templates.projectInvite = CTAEmailTemplate({
  subject(opts) {
    return `${_.escape(
      SpamSafe.safeProjectName(opts.project.name, 'New Project')
    )} - shared by ${_.escape(
      SpamSafe.safeEmail(opts.owner.email, 'a collaborator')
    )}`
  },
  title(opts) {
    return `${_.escape(
      SpamSafe.safeProjectName(opts.project.name, 'New Project')
    )} - shared by ${_.escape(
      SpamSafe.safeEmail(opts.owner.email, 'a collaborator')
    )}`
  },
  message(opts) {
    return `${_.escape(
      SpamSafe.safeEmail(opts.owner.email, 'a collaborator')
    )} wants to share ${_.escape(
      SpamSafe.safeProjectName(opts.project.name, 'a new project')
    )} with you.`
  },
  ctaText() {
    return 'View project'
  },
  ctaURL(opts) {
    return opts.inviteUrl
  },
  gmailGoToAction(opts) {
    return {
      target: opts.inviteUrl,
      name: 'View project',
      description: `Join ${_.escape(
        SpamSafe.safeProjectName(opts.project.name, 'project')
      )} at ${settings.appName}`
    }
  }
})

templates.verifyEmailToJoinTeam = CTAEmailTemplate({
  subject(opts) {
    return `${_.escape(
      _formatUserNameAndEmail(opts.inviter, 'A collaborator')
    )} has invited you to join a team on ${settings.appName}`
  },
  title(opts) {
    return `${_.escape(
      _formatUserNameAndEmail(opts.inviter, 'A collaborator')
    )} has invited you to join a team on ${settings.appName}`
  },
  message(opts) {
    return `Please click the button below to join the team and enjoy the benefits of an upgraded ${settings.appName} account.`
  },
  ctaText(opts) {
    return 'Join now'
  },
  ctaURL(opts) {
    return opts.acceptInviteUrl
  }
})

templates.testEmail = CTAEmailTemplate({
  subject() {
    return `A Test Email from ${settings.appName}`
  },
  title() {
    return `A Test Email from ${settings.appName}`
  },
  greeting() {
    return 'Hi,'
  },
  message() {
    return `This is a test Email from ${settings.appName}`
  },
  ctaText() {
    return `Open ${settings.appName}`
  },
  ctaURL() {
    return settings.siteUrl
  }
})

templates.ownershipTransferConfirmationPreviousOwner = NoCTAEmailTemplate({
  subject(opts) {
    return `Project ownership transfer - ${settings.appName}`
  },
  title(opts) {
    const projectName = _.escape(
      SpamSafe.safeProjectName(opts.project.name, 'Your project')
    )
    return `${projectName} - Owner change`
  },
  message(opts, isPlainText) {
    const nameAndEmail = _.escape(
      _formatUserNameAndEmail(opts.newOwner, 'a collaborator')
    )
    const projectName = _.escape(
      SpamSafe.safeProjectName(opts.project.name, 'your project')
    )
    const projectNameDisplay = isPlainText
      ? projectName
      : `<b>${projectName}</b>`
    return [
      `As per your request, we have made ${nameAndEmail} the owner of ${projectNameDisplay}.`,
      `If you haven't asked to change the owner of ${projectNameDisplay}, please get in touch with us via ${settings.adminEmail}.`
    ]
  }
})

templates.ownershipTransferConfirmationNewOwner = CTAEmailTemplate({
  subject(opts) {
    return `Project ownership transfer - ${settings.appName}`
  },
  title(opts) {
    const projectName = _.escape(
      SpamSafe.safeProjectName(opts.project.name, 'Your project')
    )
    return `${projectName} - Owner change`
  },
  message(opts) {
    const nameAndEmail = _.escape(
      _formatUserNameAndEmail(opts.previousOwner, 'A collaborator')
    )
    const projectName = _.escape(
      SpamSafe.safeProjectName(opts.project.name, 'a project')
    )
    return `\
${nameAndEmail} has made you the owner of **${projectName}**. You can now
manage ${projectName} sharing settings.
`
  },
  ctaText(opts) {
    return 'View project'
  },
  ctaURL(opts) {
    const projectUrl = `${
      settings.siteUrl
    }/project/${opts.project._id.toString()}`
    return projectUrl
  }
})

templates.userOnboardingEmail = NoCTAEmailTemplate({
  subject(opts) {
    return `Getting more out of ${settings.appName}`
  },
  greeting(opts) {
    return ''
  },
  title(opts) {
    return `Getting more out of ${settings.appName}`
  },
  message(opts, isPlainText) {
    const learnLatexLink = EmailMessageHelper.displayLink(
      'Learn LaTeX in 30 minutes',
      `${settings.siteUrl}/learn/latex/Learn_LaTeX_in_30_minutes?utm_source=overleaf&utm_medium=email&utm_campaign=onboarding`,
      isPlainText
    )
    const templatesLinks = EmailMessageHelper.displayLink(
      'Find a beautiful template',
      `${settings.siteUrl}/latex/templates?utm_source=overleaf&utm_medium=email&utm_campaign=onboarding`,
      isPlainText
    )
    const collaboratorsLink = EmailMessageHelper.displayLink(
      'Work with your collaborators',
      `${settings.siteUrl}/learn/how-to/Sharing_a_project?utm_source=overleaf&utm_medium=email&utm_campaign=onboarding`,
      isPlainText
    )
    const siteLink = EmailMessageHelper.displayLink(
      'www.overleaf.com',
      settings.siteUrl,
      isPlainText
    )
    const userSettingsLink = EmailMessageHelper.displayLink(
      'here',
      `${settings.siteUrl}/user/settings`,
      isPlainText
    )
    return [
      `Thanks for signing up for ${settings.appName} recently. We hope you've been finding it useful!
Here are some key features to help you get the most out of the service:`,
      `${learnLatexLink}: In this tutorial we provide a quick and easy first introduction to LaTeX with no prior knowledge required. By the time you are finished, you will have written your first LaTeX document!`,
      `${templatesLinks}: If you're looking for a template or example to get started, we've a large selection available in our template gallery, including CVs, project reports, journal articles and more.`,
      `${collaboratorsLink}: One of the key features of Overleaf is the ability to share projects and collaborate on them with other users. Find out how to share your projecs with your colleagues in this quick how-to guide.`,
      `If you have any questions, please let us know, and thanks again for using Overleaf.`,
      `John`,
      `Dr John Hammersley <br />Co-founder & CEO <br />${siteLink}<hr>`,
      `Don't want onboarding emails like this from us? Don't worry, this is the only one. If you've previously subscribed to emails about product offers and company news and events, you can unsubscribe ${userSettingsLink}.`
    ]
  }
})

templates.securityAlert = NoCTAEmailTemplate({
  subject(opts) {
    return `Overleaf security note: ${opts.action}`
  },
  title(opts) {
    return opts.action.charAt(0).toUpperCase() + opts.action.slice(1)
  },
  message(opts, isPlainText) {
    const dateFormatted = moment().format('dddd D MMMM YYYY')
    const timeFormatted = moment().format('HH:mm')
    const helpLink = EmailMessageHelper.displayLink(
      'quick guide',
      `${settings.siteUrl}/learn/how-to/Keeping_your_account_secure`,
      isPlainText
    )

    const actionDescribed = EmailMessageHelper.cleanHTML(
      opts.actionDescribed,
      isPlainText
    )

    if (!opts.message) {
      opts.message = []
    }
    const message = opts.message.map(m => {
      return EmailMessageHelper.cleanHTML(m, isPlainText)
    })

    return [
      `We are writing to let you know that ${actionDescribed} on ${dateFormatted} at ${timeFormatted} GMT.`,
      ...message,
      `If this was you, you can ignore this email.`,
      `If this was not you, we recommend getting in touch with our support team at ${settings.adminEmail} to report this as potentially suspicious activity on your account.`,
      `We also encourage you to read our ${helpLink} to keeping your ${settings.appName} account safe.`
    ]
  }
})

function _formatUserNameAndEmail(user, placeholder) {
  if (user.first_name && user.last_name) {
    const fullName = `${user.first_name} ${user.last_name}`
    if (SpamSafe.isSafeUserName(fullName)) {
      if (SpamSafe.isSafeEmail(user.email)) {
        return `${fullName} (${user.email})`
      } else {
        return fullName
      }
    }
  }
  return SpamSafe.safeEmail(user.email, placeholder)
}

module.exports = {
  templates,
  CTAEmailTemplate,
  NoCTAEmailTemplate,
  buildEmail
}
