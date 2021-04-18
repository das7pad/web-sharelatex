import App from '../../../../../../frontend/js/base'
import getMeta from '../../../../../../frontend/js/utils/meta'

export default App.controller('AdminProjectController', function ($scope) {
  $scope.project = getMeta('ol-admin-project-data')
  $scope.editingBrandVariationId = false
})
