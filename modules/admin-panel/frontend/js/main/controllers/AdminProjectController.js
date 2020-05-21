import App from '../../../../../../frontend/js/base'

export default App.controller('AdminProjectController', function($scope) {
  const { project } = JSON.parse($('#admin-project-data').text())
  $scope.project = project
  $scope.editingBrandVariationId = false
})
