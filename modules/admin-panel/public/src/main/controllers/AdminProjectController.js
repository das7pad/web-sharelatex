define(['base', 'libs/md5'], function(App) {
  App.controller('AdminProjectController', function(
    $scope,
    $timeout,
    $modal,
    queuedHttp
  ) {
    $scope.project = window.data.project
  })
})
