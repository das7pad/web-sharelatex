/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base'], App =>
  App.controller('GitBridgeModalController', function(
    $scope,
    $modalInstance,
    $window,
    ide
  ) {
    $scope.gitUrl = `${$window.gitBridgePublicBaseUrl}/${ide.$scope.project_id}`
    $scope.hasGitBridgeFeature = $scope.project.features.gitBridge
    $scope.userIsProjectOwner = $scope.user.id === $scope.project.owner._id

    return ($scope.cancel = () => $modalInstance.dismiss())
  }))
