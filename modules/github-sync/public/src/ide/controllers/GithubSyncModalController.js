/* eslint-disable
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
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base'], App =>
  App.controller('GithubSyncModalController', function(
    $scope,
    $modalInstance,
    $http,
    $modal,
    $window,
    $interval,
    ide
  ) {
    $scope.cancel = () => $modalInstance.dismiss()

    $scope.openExportToGithubModal = function() {
      $modalInstance.dismiss()
      return $modal.open({
        templateUrl: 'githubSyncExportModalTemplate',
        controller: 'GithubSyncExportModalController'
      })
    }

    $scope.openMergeModal = function(mergeImmediately) {
      let template
      if (mergeImmediately == null) {
        mergeImmediately = false
      }
      $modalInstance.dismiss()
      // There is no difference in the ShareLaTeX system between
      // pushing and pulling to Github. The merge request will do both:
      // push any changes in ShareLaTeX to GitHub, and import any changes
      // in GitHub back to ShareLaTeX after merging. However, from a UI
      // point of view, it's much clearer to show two options:
      // 'push to github', and 'pull from github' depending on the state of
      // the project and the commits in git. Hence the two different
      // modals for acheiving the same thing.
      if (mergeImmediately) {
        template = 'githubSyncPullFromGithubModalTemplate'
      } else {
        template = 'githubSyncPushToGithubModalTemplate'
      }
      return $modal.open({
        templateUrl: template,
        controller: 'GithubSyncMergeModalController',
        resolve: {
          mergeImmediately() {
            return mergeImmediately
          }
        }
      })
    }

    $scope.startFreeTrial = function(source) {
      if (typeof ga === 'function') {
        ga(
          'send',
          'event',
          'subscription-funnel',
          'upgraded-free-trial',
          source
        )
      }
      window.open('/user/subscription/new?planCode=student_free_trial_7_days')
      return ($scope.startedFreeTrial = true)
    }

    $scope.linkAccount = function() {
      const authWindow = $window.open(
        '/github-sync/beginAuth',
        'github-sync-auth',
        'width=700,height=500'
      )
      var poller = $interval(function() {
        // We can get errors when trying to access the URL before it returns
        // to a ShareLaTeX URL (security exceptions)
        let pathname
        try {
          pathname = __guard__(
            authWindow != null ? authWindow.location : undefined,
            x => x.pathname
          )
        } catch (e) {
          pathname = null
        }
        if (
          __guard__(
            authWindow != null ? authWindow.location : undefined,
            x1 => x1.pathname
          ) === '/github-sync/linked'
        ) {
          authWindow.close()
          $scope.loadStatus()
          return $interval.cancel(poller)
        }
      }, 1000)
      return true // See https://github.com/angular/angular.js/issues/4853#issuecomment-28491586
    }

    return ($scope.loadStatus = function() {
      $scope.status = {
        loading: true,
        error: false,
        user: {
          enabled: null
        },
        project: {
          enabled: null
        },
        commits: {
          loading: true,
          commits: []
        }
      }

      return $http
        .get('/user/github-sync/status', { disableAutoLoginRedirect: true })
        .then(function(response) {
          let { data } = response
          const userStatus = data
          $scope.status.user = userStatus
          return $http
            .get(`/project/${ide.project_id}/github-sync/status`, {
              disableAutoLoginRedirect: true
            })
            .then(function(response) {
              const projectStatus = response.data
              $scope.status.project = projectStatus
              $scope.status.loading = false

              if ($scope.status.project.enabled) {
                return $http
                  .get(
                    `/project/${ide.project_id}/github-sync/commits/unmerged`,
                    { disableAutoLoginRedirect: true }
                  )
                  .then(function(response) {
                    const commits = response.data
                    $scope.status.commits.commits = commits
                    return ($scope.status.commits.loading = false)
                  })
                  .catch(function(response) {
                    let status
                    ;({ data, status } = response)
                    if (status != null) {
                      return ($scope.status.error = { status })
                    } else {
                      return ($scope.status.error = true)
                    }
                  })
              }
            })
            .catch(function(response) {
              let status
              ;({ data, status } = response)
              if (status != null) {
                return ($scope.status.error = { status })
              } else {
                return ($scope.status.error = true)
              }
            })
        })
        .catch(function(response) {
          const { data, status } = response
          if (status != null) {
            return ($scope.status.error = { status })
          } else {
            return ($scope.status.error = true)
          }
        })
    })()
  }))
function __guard__(value, transform) {
  return typeof value !== 'undefined' && value !== null
    ? transform(value)
    : undefined
}
