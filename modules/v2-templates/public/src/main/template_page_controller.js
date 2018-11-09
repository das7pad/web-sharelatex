define(['base'], App =>
  App.controller('TemplatePageController', function($scope, $modal) {
    $scope.openViewSourceModal = function() {
      $modal.open({
        templateUrl: 'viewSourceModalTemplate'
      })
    }

    $scope.openViewInV1Modal = function() {
      $modal.open({
        templateUrl: 'viewInV1ModalTemplate'
      })
    }
  }))
