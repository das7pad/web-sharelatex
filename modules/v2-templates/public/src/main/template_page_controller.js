/* eslint-disable
    no-return-assign,
    no-undef,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base'], App =>
  App.controller('TemplatePageController', function($scope, $modal) {
    $scope.openViewSourceModal = function() {
      let modalInstance
      return (modalInstance = $modal.open({
        templateUrl: 'viewSourceModalTemplate'
      }))
    }

    return ($scope.openViewInV1Modal = function() {
      let modalInstance
      return (modalInstance = $modal.open({
        templateUrl: 'viewInV1ModalTemplate'
      }))
    })
  }))
