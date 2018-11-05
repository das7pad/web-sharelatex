/* eslint-disable
    max-len,
    no-return-assign,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base'], function(App) {
  App.controller(
    'ReferenceUnlinkController',
    ($scope, $modal) =>
      ($scope.unlinkAccount = providerStr =>
        $modal.open({
          templateUrl: 'referenceUnlinkModalTemplate',
          controller: 'ReferenceUnlinkModalController',
          resolve: {
            provider() {
              return providerStr
            }
          }
        }))
  )

  return App.controller('ReferenceUnlinkModalController', function(
    $scope,
    $modalInstance,
    provider
  ) {
    $scope.provider = provider
    return ($scope.providerUnlink = `/${provider}/unlink`)
  })
})
