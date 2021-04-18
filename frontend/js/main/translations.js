import App from '../base'
import { localStorage } from '../modules/storage'

App.controller('TranslationsPopupController', function($scope) {
  $scope.hidei18nNotification = localStorage('hide-i18n-notification')

  $scope.dismiss = function() {
    localStorage('hide-i18n-notification', true)
    $scope.hidei18nNotification = true
  }
})
