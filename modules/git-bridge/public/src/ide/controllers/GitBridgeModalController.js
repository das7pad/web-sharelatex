define(['base'], App =>
  App.controller('GitBridgeModalController', function(
    $scope,
    $modalInstance,
    $window,
    ide
  ) {
    $scope.gitUrl = `${$window.gitBridgePublicBaseUrl}/${ide.$scope.project_id}`
    // Git bridge is accessible if either the project owner or user is paying
    $scope.hasGitBridgeFeature =
      $scope.project.features.gitBridge || $scope.user.features.gitBridge
    $scope.userIsProjectOwner = $scope.user.id === $scope.project.owner._id

    $scope.cancel = () => $modalInstance.dismiss()
  }))
