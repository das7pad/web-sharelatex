/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base'], App =>
  App.controller('GitBridgeController', function($scope, $modal, ide) {
    $scope.openGitBridgeModal = () =>
      $modal.open({
        templateUrl: 'gitBridgeModalTemplate',
        controller: 'GitBridgeModalController',
        size: 'lg',
        scope: $scope
      })

    ide.gitBridgeManager = {
      openGitBridgeModal() {
        return $scope.openGitBridgeModal()
      }
    }
  }))
