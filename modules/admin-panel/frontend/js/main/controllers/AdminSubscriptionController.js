/* eslint-disable
    max-len,
    no-return-assign,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import App from '../../../../../../frontend/js/base'

App.controller('AdminSubscriptionController', function ($scope, $http) {
  $scope.subscription = window.data.subscription
  $scope.user_id = window.data.user_id

  return ($scope.deleteSubscription = function () {
    $scope.deleteError = false
    return $http({
      url: `/admin/subscription/${$scope.subscription._id}`,
      method: 'DELETE',
      headers: {
        'X-CSRF-Token': window.csrfToken,
      },
    })
      .then(() => (window.location = `/admin/user/${$scope.user_id}`))
      .catch(() => ($scope.deleteError = true))
  })
})

export default App.controller(
  'AdminCreateSubscriptionController',
  function ($scope) {
    $scope.subscription = {
      customAccount: true,
      groupPlan: true,
      planCode: 'professional',
      membersLimit: 10,
      admin_id: window.data.admin_id,
    }

    return ($scope.onSuccess = function (result) {
      const { subscription } = result.data
      const location = `/admin/user/${subscription.admin_id}/subscription/${subscription._id}`
      return (window.location = location)
    })
  }
)
