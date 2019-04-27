define(['base', 'libs/platform'], function(
  App,
  platform
) {
  return App.controller('PortalFormController', function(
    $scope,
    eventTracking,
    $http
  ) {
    const defaultMessage = 
      'Yes! I would like to explore an Overleaf Institutional Account.'
    // the form
    $scope.form = {
      department: '',
      email: '',
      firstName: '',
      lastName: '',
      message: defaultMessage,
      role: ''
    }
    $scope.sent = false
    $scope.sending = false

    $scope.submitSupport = function() {
      if ($scope.form.email == null || $scope.form.email === '') {
        $scope.error = 'Please include your email'
        return
      }
      $scope.sending = true

      let { department, firstName, lastName, message, role } = $scope.form

      const pUrl = `${$scope.siteUrl}/${$scope.portalType}/${$scope.portalSlug}`
      const messageFormatted = `
        \n**Overleaf Portal Contact**
        \n**Name:** ${firstName} ${lastName}
        \n**Message:** ${message}
        \n**Role:** ${role}
        \n**Department:** ${department}
        \n**Portal:** ${$scope.portalTitle}
        \n**Portal Link:** ${pUrl}
        `

      const tags = message.trim() === defaultMessage
        ? '' : 'Custom Portal Message'

      const data = {
        _csrf: window.csrfToken,
        email: $scope.form.email,
        message: messageFormatted || '',
        subject: "Overleaf Portal Contact",
        inbox: 'portals',
        tags: tags
      }
      const request = $http.post('/support', data)
      request.then(response => ($scope.sent = true))
      return request.catch(function() {
        $scope.error = true
        return console.log('the request failed')
      })
    }
  })
})