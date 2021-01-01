import App from '../../base'
import getMeta from '../../utils/meta'
import { escapeForInnerHTML } from '../../misc/escape'
import t from '../../misc/t'

App.controller('NotificationsController', function($scope, $http) {
  for (let notification of $scope.notifications || []) {
    notification.hide = false
  }

  $scope.samlInitPath = getMeta('ol-samlInitPath')

  $scope.dismiss = notification => {
    if (!notification._id) {
      notification.hide = true
      return
    }
    $http({
      url: `/notifications/${notification._id}`,
      method: 'DELETE',
      headers: {
        'X-Csrf-Token': window.csrfToken
      }
    }).then(() => (notification.hide = true))
  }
})

App.controller('DismissableNotificationsController', function(
  $scope,
  localStorage
) {
  $scope.shouldShowNotification =
    localStorage('dismissed-covid-19-notification-extended') !== true

  $scope.dismiss = () => {
    localStorage('dismissed-covid-19-notification-extended', true)
    $scope.shouldShowNotification = false
  }
})

App.controller('ProjectInviteNotificationController', function($scope, $http) {
  const projectName = escapeForInnerHTML(
    $scope.notification.messageOpts.projectName
  )
  const userName = escapeForInnerHTML($scope.notification.messageOpts.userName)

  $scope.notification.htmlAccepted = t(
    'notification_project_invite_accepted_message',
    { projectName }
  )
  $scope.notification.htmlNotAccepted = t(
    'notification_project_invite_message',
    { userName, projectName }
  )

  $scope.accept = function() {
    $scope.notification.inflight = true
    return $http({
      url: `/project/${
        $scope.notification.messageOpts.projectId
      }/invite/token/${$scope.notification.messageOpts.token}/accept`,
      method: 'POST',
      headers: {
        'X-Csrf-Token': window.csrfToken,
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
      .then(() => {
        $scope.notification.accepted = true
      })
      .catch(({ status }) => {
        if (status === 404) {
          // 404 probably means the invite has already been accepted and
          // deleted. Treat as success
          $scope.notification.accepted = true
        } else {
          $scope.notification.error = true
        }
      })
      .finally(() => {
        $scope.notification.inflight = false
      })
  }
})

App.controller('EmailNotificationController', function(
  $scope,
  $http,
  UserAffiliationsDataService
) {
  $scope.userEmails = []
  const _ssoAvailable = email => {
    if (!getMeta('ol-hasSamlFeature')) return false
    if (email.samlProviderId) return true
    if (!email.affiliation || !email.affiliation.institution) return false
    if (email.affiliation.institution.ssoEnabled) return true
    if (getMeta('ol-hasSamlBeta') && email.affiliation.institution.ssoBeta) {
      return true
    }
    return false
  }
  $scope.showConfirmEmail = email => {
    if (!email.confirmedAt && !email.hide) {
      if (_ssoAvailable(email)) {
        return false
      }
      return true
    }
    return false
  }
  for (let userEmail of $scope.userEmails) {
    userEmail.hide = false
  }

  const _getUserEmails = () =>
    UserAffiliationsDataService.getUserEmails().then(function(emails) {
      $scope.userEmails = emails
      $scope.$emit('project-list:notifications-received')
    })
  _getUserEmails()

  $scope.resendConfirmationEmail = function(userEmail) {
    userEmail.confirmationInflight = true
    userEmail.error = false
    UserAffiliationsDataService.resendConfirmationEmail(userEmail.email)
      .then(() => {
        userEmail.hide = true
        $scope.$emit('project-list:notifications-received')
      })
      .catch(error => {
        userEmail.error = true
        console.error(error)
        $scope.$emit('project-list:notifications-received')
      })
      .finally(() => {
        userEmail.confirmationInflight = false
      })
  }
})
