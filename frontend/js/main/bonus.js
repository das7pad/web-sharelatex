/* eslint-disable
    no-return-assign,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import App from '../base'
App.controller('BonusLinksController', ($scope, $modal) => {
  $scope.openLinkToUsModal = () =>
    $modal.open({
      templateUrl: 'BonusLinkToUsModal',
      controller: 'BonusModalController'
    })

  $(function() {
    $('.twitter').click(function() {
      ga('send', 'event', 'referal-button', 'clicked', 'twitter')
    })
    $('.email').click(function() {
      ga('send', 'event', 'referal-button', 'clicked', 'email')
    })
    $('.facebook').click(function() {
      ga('send', 'event', 'referal-button', 'clicked', 'facebook')
    })
    $('.link').click(function() {
      ga('send', 'event', 'referal-button', 'clicked', 'direct-link')
    })
  })
})

export default App.controller(
  'BonusModalController',
  ($scope, $modalInstance) => ($scope.cancel = () => $modalInstance.dismiss())
)
