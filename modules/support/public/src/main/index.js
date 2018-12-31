// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base', 'libs/platform', 'services/algolia-search'], function(
  App,
  platform
) {
  App.controller(
    'ContactModal',
    ($scope, $modal) =>
      // the button to open the support modal / form with affected URL input
      ($scope.contactUsModal = function() {
        $modal.open({
          templateUrl: 'contactModalTemplate',
          controller: 'ContactModalController',
          scope: $scope
        })
      })
  )

  App.controller(
    'ContactGeneralModal',
    ($scope, $modal) =>
      // the button to open the general modal / form WITHOUT affected URL input
      ($scope.openModal = function() {
        $modal.open({
          templateUrl: 'contactGeneralModalTemplate',
          controller: 'ContactGeneralModalController'
        })
      })
  )

  App.controller(
    'ContactModalController',
    ($scope, $modalInstance) =>
      // the modal, which contains a form

      ($scope.close = () => $modalInstance.close())
  )

  App.controller(
    'ContactGeneralModalController',
    ($scope, $modalInstance) =>
      // the modal, which contains a form

      ($scope.close = () => $modalInstance.close())
  )

  return App.controller('ContactFormController', function(
    $scope,
    algoliaSearch,
    eventTracking,
    $http
  ) {
    // the form
    $scope.form = {
      email: ''
    }
    $scope.sent = false
    $scope.sending = false
    $scope.suggestions = []

    const _handleSearchResults = function(success, results) {
      const suggestions = (() => {
        const result = []
        for (let hit of Array.from(results.hits)) {
          const pageUnderscored = __guard__(
            hit != null ? hit.pageName : undefined,
            x => x.replace(/\s/g, '_')
          )
          const pageSlug = encodeURIComponent(pageUnderscored)
          result.push(
            (suggestion = {
              url: `/learn/how-to/${pageSlug}`,
              name: hit._highlightResult.pageName.value
            })
          )
        }
        return result
      })()

      if (results.hits.length) {
        eventTracking.sendMB('contact-form-suggestions-shown')
      }

      return $scope.$applyAsync(() => ($scope.suggestions = suggestions))
    }

    $scope.contactUs = function() {
      if ($scope.form.email == null || $scope.form.email === '') {
        console.log('email not set')
        return
      }
      $scope.sending = true
      const ticketNumber = Math.floor((1 + Math.random()) * 0x10000).toString(
        32
      )
      let { message } = $scope.form
      if ($scope.form.project_url != null) {
        message = `${message}\n\n project_url = ${$scope.form.project_url}`
      }
      const data = {
        _csrf: window.csrfToken,
        email: $scope.form.email,
        message: message || '',
        subject: $scope.form.subject + ` - [${ticketNumber}]`,
        labels: 'support',
        inbox: 'support',
        about: `<div>browser: ${platform != null ? platform.name : undefined} ${
          platform != null ? platform.version : undefined
        }</div> \
<div>os: ${__guard__(
          platform != null ? platform.os : undefined,
          x => x.family
        )} ${__guard__(
          platform != null ? platform.os : undefined,
          x1 => x1.version
        )}</div>`
      }
      const request = $http.post('/support', data)
      request.then(response => ($scope.sent = true))
      return request.catch(function() {
        $scope.error = true
        return console.log('the request failed')
      })
    }

    var _deregisterShowSuggestionsWatcher = $scope.$watch(
      'showContactFormSuggestions',
      function(showContactFormSuggestions) {
        if (showContactFormSuggestions != null) {
          if (showContactFormSuggestions === true) {
            _setupSuggestionsWatcher()
          }
          return _deregisterShowSuggestionsWatcher()
        }
      }
    )

    var _setupSuggestionsWatcher = () =>
      $scope.$watch('form.subject', function(newVal, oldVal) {
        if (newVal && newVal !== oldVal && newVal.length > 3) {
          return algoliaSearch.searchKB(newVal, _handleSearchResults, {
            hitsPerPage: 3,
            typoTolerance: 'strict'
          })
        } else {
          return ($scope.suggestions = [])
        }
      })

    return ($scope.clickSuggestionLink = url =>
      eventTracking.sendMB('contact-form-suggestions-clicked', { url }))
  })
})

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined
}
