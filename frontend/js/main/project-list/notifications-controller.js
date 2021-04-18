import App from '../../base'
import getMeta from '../../utils/meta'
import { escapeForInnerHTML } from '../../misc/escape'
import t from '../../misc/t'
import { localStorage } from '../../modules/storage'

App.controller('NotificationsController', function(
  $scope,
  $http,
  eventTracking
) {
  // initialize
  $scope.notifications = []

  $scope.samlInitPath = getMeta('ol-samlInitPath')

  $scope.dismiss = notification => {
    if (!notification._id) {
      notification.hide = true
      return
    }
    apiRequest({
      url: `/notifications/${notification._id}`,
      method: 'DELETE'
    }).then(() => (notification.hide = true))
  }

  let jwtNotifications = getMeta('ol-jwtNotifications')
  function apiRequest({ url, method }) {
    let headers
    if (jwtNotifications) {
      const publicUrlNotifications = getMeta('ol-publicUrlNotifications') || ''
      url = publicUrlNotifications + '/jwt' + url
      headers = { Authorization: 'Bearer ' + jwtNotifications }
    } else if (method !== 'GET') {
      headers = { 'X-Csrf-Token': getMeta('ol-csrfToken') }
    }
    return $http({ method, url, headers })
  }

  function fetchNotifications() {
    return apiRequest({ method: 'GET', url: '/notifications' })
      .then(response => {
        if (response.status === 200) {
          return response.data
        }
        if (jwtNotifications && response.status === 401) {
          eventTracking.sendMB('jwt-notifications-error')
          // use a proxied request
          jwtNotifications = null
          // immediately retry without the jwt
          return fetchNotifications()
        }
        throw new Error(`unexpected status ${response.status}`)
      })
      .catch(error => {
        sl_console.log('[NotificationsController] failed to fetch', error)
        // retry with delay
        return new Promise(resolve => {
          setTimeout(() => {
            fetchNotifications().then(resolve)
          }, 10000)
        })
      })
  }

  function setNotifications(notifications) {
    for (const notification of notifications) {
      notification.html = t(notification.templateKey, notification.messageOpts)
      notification.hide = false
    }
    $scope.notifications = notifications
  }

  fetchNotifications().then(setNotifications)
})

App.controller('DismissableNotificationsController', function($scope) {
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
      url: `/project/${$scope.notification.messageOpts.projectId}/invite/token/${$scope.notification.messageOpts.token}/accept`,
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
  $scope.userEmails = window.data.userEmails
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

  $scope.resendConfirmationEmail = function(userEmail) {
    userEmail.confirmationInflight = true
    userEmail.error = false
    userEmail.errorMessage = null
    UserAffiliationsDataService.resendConfirmationEmail(userEmail.email)
      .then(() => {
        userEmail.hide = true
        $scope.$emit('project-list:notifications-received')
      })
      .catch(error => {
        userEmail.error = true
        userEmail.errorMessage = error.data.message
        console.error(error)
        $scope.$emit('project-list:notifications-received')
      })
      .finally(() => {
        userEmail.confirmationInflight = false
      })
  }
})
