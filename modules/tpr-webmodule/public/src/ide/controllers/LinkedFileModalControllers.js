/* eslint-disable
    camelcase,
    max-len,
    no-return-assign,
    no-undef,
*/
/*
 * decaffeinate suggestions:
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

define(['base'], function(App) {
  const controllerForProvider = (provider, supportsGroups) => [
    '$scope',
    'ide',
    '$timeout',
    '$window',
    '$interval',
    'event_tracking',
    'sixpack',
    function(
      $scope,
      ide,
      $timeout,
      $window,
      $interval,
      event_tracking,
      sixpack
    ) {
      const features =
        ide.$scope.user != null ? ide.$scope.user.features : undefined
      $scope.userHasProviderFeature =
        (features != null ? features[provider] : undefined) ||
        (features != null ? features.references : undefined)
      $scope.userHasProviderLink = __guard__(
        ide.$scope.user != null ? ide.$scope.user.refProviders : undefined,
        x => x[provider]
      )

      $scope.canLoadBibtex = () =>
        $scope.userHasProviderFeature && $scope.userHasProviderLink

      // Don't overwrite the state object, since we inherit the modal state
      // object to communicate the 'valid' attribute back to it.
      $scope.state.fetchingGroups = false
      $scope.state.inflight = false
      $scope.state.error = false
      $scope.state.errorType = 'default' // || 'expired' || 'forbidden'

      $scope.data = {
        isInitialized: false,
        groups: null,
        selectedGroupId: null,
        format: 'bibtex',
        name: 'references.bib'
      }

      const _handleError = function(err) {
        if (err.data === 'already exists') {
          _reset({ error: 'name-exists' })
        } else if (err.status === 401) {
          _reset({ error: 'expired' })
        } else if (err.status === 403) {
          _reset({ error: 'forbidden' })
        } else if (err.status === 400) {
          _reset({ error: 'default' })
        } else {
          _reset({ error: true })
        }
      }

      var _reset = function(opts) {
        if (opts == null) {
          opts = {}
        }
        $scope.state.fetchingGroups = false
        $scope.state.fetchingBibtexPreview = false
        $scope.state.inflight = false
        if (opts.error != null) {
          $scope.state.error = true
          if (opts.error === true) {
            $scope.state.errorType = 'default'
          } else {
            $scope.state.errorType = opts.error
          }
        } else {
          $scope.state.error = false
        }
      }

      $scope.hasGroups = () =>
        $scope.data.groups != null && $scope.data.groups.length > 0

      $scope.supportsGroups = function() {
        if (!$scope.canLoadBibtex()) {
          return
        }
        _reset()
        $scope.state.fetchingGroups = true
        return ide.$http
          .get(`/${provider}/groups`, { disableAutoLoginRedirect: true })
          .then(function(resp) {
            const { data } = resp
            $scope.data.groups = data.groups
            $scope.data.selectedGroup = null
            $scope.data.isInitialized = true
            return _reset()
          })
          .catch(function(err) {
            console.warn(err)
            return _handleError(err)
          })
      }

      const validate = function() {
        const { name, isInitialized } = $scope.data
        if (name == null || name.length === 0) {
          $scope.state.valid = false
        } else if (isInitialized == null) {
          $scope.state.valid = false
        } else {
          $scope.state.valid = true
        }
      }

      $scope.$watch('data.name', validate)
      validate()
      // $timeout(() => console.log('open'), 200)
      $timeout(() => $scope.$broadcast('open'), 200)

      $scope.$on('create', function() {
        if (!$scope.data.isInitialized) {
          return
        }
        if (!$scope.data.isInitialized || !$scope.data.name) {
          return
        }
        const payload = {}
        if (
          provider === 'mendeley' &&
          $scope.hasGroups() &&
          $scope.data.selectedGroupId
        ) {
          payload.group_id = $scope.data.selectedGroupId
        }
        if (provider === 'zotero') {
          payload.format = $scope.data.format
        }
        event_tracking.send(`references-${provider}`, 'modal', 'import-bibtex')
        $scope.state.inflight = true
        return ide.fileTreeManager
          .createLinkedFile(
            $scope.data.name,
            $scope.parent_folder,
            provider,
            payload
          )
          .then(function() {
            $scope.$emit('references:should-reindex', {})
            $scope.$emit('done')
            return _reset()
          })
          .catch(err => _handleError(err))
      })

      const _init = function() {
        if (!$scope.canLoadBibtex()) {
          return
        }
        if (supportsGroups) {
          $scope.state.fetchingGroups = true
          $timeout(() => $scope.supportsGroups(), 500)
        } else {
          $scope.data.isInitialized = true
        }
      }
      _init()

      // Stuff for managing trials and linkages
      $scope.startFreeTrial = function(source) {
        let plan = 'collaborator_free_trial_7_days'
        if (typeof ga === 'function') {
          ga(
            'send',
            'event',
            'subscription-funnel',
            'upgraded-free-trial',
            source
          )
        }
        const w = window.open()
        const go = function() {
          $scope.startedFreeTrial = true
          w.location = `/user/subscription/new?planCode=${plan}&ssp=true`
        }
        if ($scope.shouldABTestPlans) {
          sixpack.participate(
            'plans-1610',
            ['default', 'heron', 'ibis'],
            function(chosenVariation, rawResponse) {
              if (['heron', 'ibis'].includes(chosenVariation)) {
                plan = `collaborator_${chosenVariation}`
              }
              return go()
            }
          )
        } else {
          go()
        }
      }

      $scope.linkAccount = function() {
        const authWindow = $window.open(
          `/${provider}/oauth`,
          'reference-auth',
          'width=700,height=500'
        )
        event_tracking.send(
          `references-${provider}`,
          'modal',
          'start-link-account'
        )
        var poller = $interval(function() {
          // We can get errors when trying to access the URL before it returns
          // to a ShareLaTeX URL (security exceptions)
          let pathname
          try {
            pathname = __guard__(
              authWindow != null ? authWindow.location : undefined,
              x1 => x1.pathname
            )
          } catch (e) {
            pathname = null
          }
          if (pathname === '/user/settings') {
            authWindow.close()
            event_tracking.send(
              `references-${provider}`,
              'modal',
              'end-link-account'
            )
            $scope.userHasProviderLink = true
            ide.$scope.user.refProviders[provider] = true
            $timeout($scope.supportsGroups(), 500)
            $interval.cancel(poller)
          }
        }, 1000)
        return true // See https://github.com/angular/angular.js/issues/4853#issuecomment-28491586
      }

      window._S = $scope
    }
  ]

  App.controller(
    'MendeleyLinkedFileModalController',
    controllerForProvider('mendeley', true)
  )
  App.controller(
    'ZoteroLinkedFileModalController',
    controllerForProvider('zotero', false)
  )
})

function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined
}
