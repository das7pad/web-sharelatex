import App from '../base'

App.controller('TranslationsPopupController', function($scope, localStorage) {
  $scope.hidei18nNotification = localStorage('hide-i18n-notification')

  $scope.dismiss = function() {
    localStorage('hide-i18n-notification', true)
    $scope.hidei18nNotification = true
  }
})
