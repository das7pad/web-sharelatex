import App from '../../../base'
import { localStorage } from '../../../modules/storage'

export default App.controller(
  'FileTreeFolderController',
  function ($scope, ide, $modal) {
    $scope.expanded =
      localStorage(`folder.${$scope.entity.id}.expanded`) || false

    $scope.toggleExpanded = function () {
      $scope.expanded = !$scope.expanded
      $scope._storeCurrentStateInLocalStorage()
    }

    $scope.$on('entity-file:selected', function () {
      $scope.expanded = true
      $scope._storeCurrentStateInLocalStorage()
    })

    $scope._storeCurrentStateInLocalStorage = function () {
      localStorage(`folder.${$scope.entity.id}.expanded`, $scope.expanded)
    }
  }
)
