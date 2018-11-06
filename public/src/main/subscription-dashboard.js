/* eslint-disable
    camelcase,
    max-len,
    no-return-assign,
    no-undef,
    no-unused-vars,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base'], function(App) {
  const SUBSCRIPTION_URL = '/user/subscription/update'

  const ensureRecurlyIsSetup = _.once(() => {
    if (!recurly) return
    recurly.configure(window.recurlyApiKey)
  })

  App.controller('ChangePlanFormController', function(
    $scope,
    $modal,
    MultiCurrencyPricing
  ) {
    ensureRecurlyIsSetup()

    $scope.changePlan = () =>
      $modal.open({
        templateUrl: 'confirmChangePlanModalTemplate',
        controller: 'ConfirmChangePlanController',
        scope: $scope
      })

    $scope.$watch('plan', function(plan) {
      if (!plan) return
      // Work out how to display the price for this plan, taking into account
      // the tax from Recurly
      const planCode = plan.planCode
      const { currency, taxRate } = window.subscription.recurly
      const currencySymbol = MultiCurrencyPricing.plans[currency].symbol
      $scope.price = '...' // Placeholder while we talk to recurly
      const pricing = recurly.Pricing()
      pricing
        .plan(planCode, { quantity: 1 })
        .currency(MultiCurrencyPricing.currencyCode)
        .done(function(price) {
          const totalPriceExTax = parseFloat(price.next.total)
          $scope.$evalAsync(function() {
            let taxAmmount = totalPriceExTax * taxRate
            if (isNaN(taxAmmount)) {
              taxAmmount = 0
            }
            $scope.price = `${currencySymbol}${totalPriceExTax + taxAmmount}`
          })
        })
    })
  })

  App.controller('ConfirmChangePlanController', function(
    $scope,
    $modalInstance,
    $http
  ) {
    $scope.confirmChangePlan = function() {
      const body = {
        plan_code: $scope.plan.planCode,
        _csrf: window.csrfToken
      }

      $scope.inflight = true

      return $http
        .post(`${SUBSCRIPTION_URL}?origin=confirmChangePlan`, body)
        .then(() => location.reload())
        .catch(() => console.log('something went wrong changing plan'))
    }

    return ($scope.cancel = () => $modalInstance.dismiss('cancel'))
  })

  App.controller('LeaveGroupModalController', function(
    $scope,
    $modalInstance,
    $http
  ) {
    $scope.confirmLeaveGroup = function() {
      $scope.inflight = true
      return $http({
        url: '/subscription/group/user',
        method: 'DELETE',
        params: { admin_user_id: $scope.admin_id, _csrf: window.csrfToken }
      })
        .then(() => location.reload())
        .catch(() => console.log('something went wrong changing plan'))
    }

    return ($scope.cancel = () => $modalInstance.dismiss('cancel'))
  })

  App.controller('UserSubscriptionController', function(
    $scope,
    MultiCurrencyPricing,
    $http,
    sixpack,
    $modal
  ) {
    $scope.plans = MultiCurrencyPricing.plans
    const subscription = window.subscription
    if (!subscription) {
      throw new Error(
        'expected subscription object for UserSubscriptionController'
      )
    }

    const taxRate = subscription.recurly.taxRate

    const sevenDaysTime = new Date()
    sevenDaysTime.setDate(sevenDaysTime.getDate() + 7)
    const freeTrialEndDate = new Date(subscription.recurly.trial_ends_at)
    const freeTrialInFuture = freeTrialEndDate > new Date()
    const freeTrialExpiresUnderSevenDays = freeTrialEndDate < sevenDaysTime

    $scope.view = 'overview'

    const isMonthlyCollab =
      subscription.plan.planCode.indexOf('collaborator') !== -1 &&
      subscription.plan.planCode.indexOf('ann') === -1 &&
      !subscription.groupPlan
    const stillInFreeTrial = freeTrialInFuture && freeTrialExpiresUnderSevenDays

    if (isMonthlyCollab && stillInFreeTrial) {
      $scope.showExtendFreeTrial = true
    } else if (isMonthlyCollab && !stillInFreeTrial) {
      $scope.showDowngradeToStudent = true
    } else {
      $scope.showBasicCancel = true
    }

    ensureRecurlyIsSetup()

    recurly
      .Pricing()
      .plan('student', { quantity: 1 })
      .currency(MultiCurrencyPricing.currencyCode)
      .done(function(price) {
        const totalPriceExTax = parseFloat(price.next.total)
        return $scope.$evalAsync(function() {
          let taxAmmount = totalPriceExTax * taxRate
          if (isNaN(taxAmmount)) {
            taxAmmount = 0
          }
          $scope.currencySymbol =
            MultiCurrencyPricing.plans[MultiCurrencyPricing.currencyCode].symbol
          return ($scope.studentPrice =
            $scope.currencySymbol + (totalPriceExTax + taxAmmount))
        })
      })

    $scope.downgradeToStudent = function() {
      const body = {
        plan_code: 'student',
        _csrf: window.csrfToken
      }
      $scope.inflight = true
      return $http
        .post(`${SUBSCRIPTION_URL}?origin=downgradeToStudent`, body)
        .then(() => location.reload())
        .catch(() => console.log('something went wrong changing plan'))
    }

    $scope.cancelSubscription = function() {
      const body = { _csrf: window.csrfToken }

      $scope.inflight = true
      return $http
        .post('/user/subscription/cancel', body)
        .then(() => location.reload())
        .catch(() => console.log('something went wrong changing plan'))
    }

    $scope.removeSelfFromGroup = function(admin_id) {
      $scope.admin_id = admin_id
      return $modal.open({
        templateUrl: 'LeaveGroupModalTemplate',
        controller: 'LeaveGroupModalController',
        scope: $scope
      })
    }

    $scope.switchToCancelationView = () => ($scope.view = 'cancelation')

    return ($scope.exendTrial = function() {
      const body = { _csrf: window.csrfToken }
      $scope.inflight = true
      return $http
        .put('/user/subscription/extend', body)
        .then(() => location.reload())
        .catch(() => console.log('something went wrong changing plan'))
    })
  })
})

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined
}
