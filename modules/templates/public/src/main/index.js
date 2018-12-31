/* global ga, AlgoliaSearch */
// TODO: This file was created by bulk-decaffeinate.
// Sanity-check the conversion and remove this comment.
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base'], function(App) {
  App.controller('openInSlController', function(
    $scope,
    $http,
    $window,
    $timeout
  ) {
    $scope.openInSlText = 'Open in ShareLaTeX'
    $scope.isDisabled = false
    $scope.state = {
      unpublishInFlight: false,
      republishInFlight: false,
      apiProblem: false
    }

    $scope.buttonsDisabled = () =>
      $scope.state.unpublishInFlight || $scope.state.republishInFlight

    $scope.open = function() {
      $scope.openInSlText = 'Creating...'
      $scope.isDisabled = true
      return ga(
        'send',
        'event',
        'template-site',
        'open-in-sl',
        $('.page-header h1').text()
      )
    }

    $scope.downloadZip = () =>
      ga(
        'send',
        'event',
        'template-site',
        'download-zip',
        $('.page-header h1').text()
      )

    $scope.republish = function(projectId) {
      $scope.state.republishInFlight = true
      return $http
        .post(`/project/${projectId}/template/publish`, {
          _csrf: window.csrfToken
        })
        .then(function() {
          $scope.state.republishInFlight = false
          $scope.state.apiProblem = false
          return $window.location.reload()
        })
        .catch(function() {
          $scope.state.republishInFlight = false
          return ($scope.state.apiProblem = false)
        })
    }

    return ($scope.unpublish = function(projectId) {
      $scope.state.unpublishInFlight = true
      return $http
        .post(`/project/${projectId}/template/unpublish`, {
          _csrf: window.csrfToken
        })
        .then(function() {
          $scope.state.unpublishInFlight = false
          $scope.state.apiProblem = false
          return $timeout(() => ($window.location.href = '/templates'), 500)
        })
        .catch(function() {
          $scope.state.unpublishInFlight = false
          // TODO: error handling
          console.log('>> unpub failed')
          return ($scope.state.apiProblem = true)
        })
    })
  })

  App.factory('algolia', function() {
    if (
      __guard__(
        __guard__(
          typeof window !== 'undefined' && window !== null
            ? window.sharelatex
            : undefined,
          x1 => x1.algolia
        ),
        x => x.app_id
      ) != null
    ) {
      const client = new AlgoliaSearch(
        window.sharelatex.algolia != null
          ? window.sharelatex.algolia.app_id
          : undefined,
        window.sharelatex.algolia != null
          ? window.sharelatex.algolia.api_key
          : undefined
      )
      const index = client.initIndex(
        __guard__(
          window.sharelatex.algolia != null
            ? window.sharelatex.algolia.indexes
            : undefined,
          x2 => x2.templates
        )
      )
      return index
    } else {
      return {}
    }
  })

  App.controller('SearchController', function($scope, algolia, _, $window) {
    $scope.hits = []

    $scope.showSearch =
      __guard__(
        $window.sharelatex.algolia != null
          ? $window.sharelatex.algolia.indexes
          : undefined,
        x => x.templates
      ) != null

    $scope.clearSearchText = function() {
      $scope.searchQueryText = ''
      return updateHits([])
    }

    $scope.safeApply = function(fn) {
      const phase = $scope.$root.$$phase
      if (phase === '$apply' || phase === '$digest') {
        return $scope.$eval(fn)
      } else {
        return $scope.$apply(fn)
      }
    }

    const buildHitViewModel = function(hit) {
      let result
      return (result = {
        name: hit._highlightResult.name.value,
        description: hit._highlightResult.description.value,
        url: `/templates/${hit._id}`,
        image_url: `${__guard__(
          window.sharelatex != null ? window.sharelatex.templates : undefined,
          x1 => x1.cdnDomain
        )}/templates/${hit._id}/v/${
          hit.version
        }/pdf-converted-cache/style-thumbnail`
      })
    }

    var updateHits = hits => $scope.safeApply(() => ($scope.hits = hits))

    return ($scope.search = function() {
      let query = $scope.searchQueryText
      if (query == null || query.length === 0) {
        updateHits([])
        return
      }

      query = `${__guard__(
        window.sharelatex != null ? window.sharelatex.templates : undefined,
        x1 => x1.user_id
      )} ${query}`
      return algolia.search(query, function(err, response) {
        if (response.hits.length === 0) {
          return updateHits([])
        } else {
          const hits = _.map(response.hits, buildHitViewModel)
          return updateHits(hits)
        }
      })
    })
  })

  App.controller(
    'MissingTemplateController',
    ($scope, $modal) =>
      ($scope.showMissingTemplateModal = () =>
        $modal.open({
          templateUrl: 'missingTemplateModal',
          controller: 'MissingTemplateModalController'
        }))
  )

  return App.controller(
    'MissingTemplateModalController',
    ($scope, $modalInstance) => ($scope.cancel = () => $modalInstance.dismiss())
  )
})

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined
}
