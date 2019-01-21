// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base'], App =>
  App.controller('DropboxRegistrationController', function(
    $scope,
    $window,
    $http,
    $timeout
  ) {
    const sliceLocation = window.location.hash.indexOf('access_token')
    const data = {
      _csrf: window.csrfToken,
      tokenInfo: window.location.hash.slice(sliceLocation)
    }
    $scope.state = 'processing'
    return $http
      .post('/dropbox/completeRegistration', data)
      .then(function() {
        $scope.state = 'success'
        const redirect = () => ($window.location.href = '/user/settings')
        return $timeout(redirect, 5000)
      })
      .catch(function() {
        $scope.state = 'error'
        return console.log('the request failed')
      })
  }))
