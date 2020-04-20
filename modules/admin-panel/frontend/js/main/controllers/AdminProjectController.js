define(['../../../../../../frontend/js/base'], function (App) {
  App.controller('AdminProjectController', function ($scope) {
    const { project } = JSON.parse($('#admin-project-data').text())
    $scope.project = project
    $scope.editingBrandVariationId = false
  })
})
