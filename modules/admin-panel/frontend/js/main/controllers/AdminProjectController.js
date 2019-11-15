define(['base'], function(App) {
  App.controller('AdminProjectController', function($scope) {
    let { project } = JSON.parse($('#admin-project-data').text())
    $scope.project = project
    $scope.editingBrandVariationId = false
  })
})
