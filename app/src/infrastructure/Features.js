const Settings = require('@overleaf/settings')
const fs = require('fs')

const publicRegistrationModuleAvailable = fs.existsSync(
  `${__dirname}/../../../modules/public-registration`
)

const supportModuleAvailable = fs.existsSync(
  `${__dirname}/../../../modules/support`
)

const trackChangesModuleAvailable = fs.existsSync(
  `${__dirname}/../../../modules/track-changes`
)
function externalAuthenticationSystemUsed() {
  return (
    !!Settings.ldap ||
    !!Settings.enableSaml ||
    !!(Settings.overleaf && Settings.overleaf.oauth)
  )
}

/**
 * @typedef {Object} Settings
 * @property {Object | undefined}  apis
 * @property {Object | undefined}  apis.linkedUrlProxy
 * @property {string | undefined}  apis.linkedUrlProxy.url
 * @property {Object | undefined}  apis.references
 * @property {string | undefined}  apis.references.url
 * @property {boolean | undefined} enableGithubSync
 * @property {boolean | undefined} enableGitBridge
 * @property {boolean | undefined} enableHomepage
 * @property {boolean | undefined} enableSaml
 * @property {boolean | undefined} ldap
 * @property {boolean | undefined} oauth
 * @property {Object | undefined} overleaf
 * @property {Object | undefined} overleaf.oauth
 * @property {boolean | undefined} saml
 */

const Features = {
  EXTERNAL_AUTHENTICATION_SYSTEM_USED: externalAuthenticationSystemUsed(),
  externalAuthenticationSystemUsed,

  /**
   * Whether a feature is enabled in the appliation's configuration
   *
   * @param {string} feature
   * @returns {boolean}
   */
  hasFeature(feature) {
    switch (feature) {
      case 'saas':
        return Boolean(Settings.overleaf)
      case 'homepage':
        return Boolean(Settings.enableHomepage)
      case 'registration':
        return (
          !Features.EXTERNAL_AUTHENTICATION_SYSTEM_USED || !!Settings.overleaf
        )
      case 'github-sync':
        return Boolean(Settings.enableGithubSync)
      case 'git-bridge':
        return Boolean(Settings.enableGitBridge)
      case 'custom-togglers':
        return Boolean(Settings.overleaf)
      case 'oauth':
        return Boolean(Settings.oauth)
      case 'templates-server-pro':
        return !Settings.overleaf
      case 'affiliations':
      case 'analytics':
        return !!(Settings.apis && Settings.apis.v1 && Settings.apis.v1.url)
      case 'overleaf-integration':
        return Boolean(Settings.overleaf)
      case 'references':
        return !!Settings.apis.references.url
      case 'saml':
        return Boolean(Settings.enableSaml)
      case 'link-url':
        return !!(
          Settings.apis.linkedUrlProxy &&
          (Settings.apis.linkedUrlProxy.chain ||
            Settings.apis.linkedUrlProxy.url)
        )
      case 'public-registration':
        return publicRegistrationModuleAvailable
      case 'support':
        return supportModuleAvailable
      case 'track-changes':
        return trackChangesModuleAvailable
      default:
        throw new Error(`unknown feature: ${feature}`)
    }
  },
}

module.exports = Features
