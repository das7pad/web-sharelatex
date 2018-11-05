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
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base'], App =>
  App.controller('ReferencesController', function($scope, $modal, ide, $http) {
    const { user } = ide.$scope
    const features = user != null ? user.features : undefined
    $scope.thirdPartyReferencesEnabled =
      (features != null ? features.mendeley : undefined) ||
      (features != null ? features.references : undefined)

    return ($scope.openNewDocModal = () =>
      $modal.open({
        templateUrl: 'newFileModalTemplate',
        controller: 'NewFileModalController',
        size: 'lg',
        resolve: {
          parent_folder() {
            return null
          },
          type() {
            return 'mendeley'
          }
        }
      }))
  }))
