/* eslint-disable
    camelcase,
    chai-friendly/no-unused-expressions,
    max-len,
    no-return-assign,
    no-undef,
*/
// TODO: This file was created by bulk-decaffeinate.
// Fix any style issues and re-enable lint.
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define(['base'], function(App) {
  App.controller('AdminUserController', function(
    $scope,
    $timeout,
    $modal,
    queuedHttp
  ) {
    $scope.user = window.data.user
    $scope.projects = window.data.projects
    $scope.searchText = { value: '' }
    $scope.searchRegExp = { value: false }
    $scope.selectedProjects = []
    $scope.predicate = 'lastUpdated'
    $scope.reverse = true
    $scope.allSelected = false
    $scope.enableBetaError = false

    for (var project of Array.from($scope.projects)) {
      project.accessLevel = 'owner'
    }

    $scope.clearSearchText = function() {
      $scope.searchText.value = ''
      return $scope.updateVisibleProjects()
    }

    $scope.searchProjects = () => $scope.updateVisibleProjects()

    $scope.updateSelectedProjects = () =>
      ($scope.selectedProjects = $scope.projects.filter(
        project => project.selected
      ))

    $scope.getSelectedProjects = () => $scope.selectedProjects

    $scope.openArchiveProjectsModal = function() {
      const modalInstance = $modal.open({
        templateUrl: 'deleteProjectsModalTemplate',
        controller: 'AdminDeleteProjectsModalController',
        resolve: {
          projects() {
            return $scope.getSelectedProjects()
          }
        }
      })
      return modalInstance.result.then(() =>
        $scope.archiveOrLeaveSelectedProjects()
      )
    }

    $scope.archiveOrLeaveSelectedProjects = function() {
      const selected_projects = $scope.getSelectedProjects()

      for (project of Array.from(selected_projects)) {
        project.archived = true
        queuedHttp({
          method: 'DELETE',
          url: `/admin/project/${project._id}`,
          headers: {
            'X-CSRF-Token': window.csrfToken
          }
        })
      }

      return $scope.updateVisibleProjects()
    }

    $scope.changePredicate = function(newPredicate) {
      if ($scope.predicate === newPredicate) {
        $scope.reverse = !$scope.reverse
      }
      return ($scope.predicate = newPredicate)
    }

    $scope.getSortIconClass = function(column) {
      if (column === $scope.predicate && $scope.reverse) {
        return 'fa-caret-down'
      } else if (column === $scope.predicate && !$scope.reverse) {
        return 'fa-caret-up'
      } else {
        return ''
      }
    }

    $scope.openDeleteSecondaryEmailModal = function(emailToRemove) {
      const modalInstance = $modal.open({
        templateUrl: 'deleteSecondaryEmailModalTemplate',
        controller: 'DeleteSecondaryEmailModalController',
        resolve: {
          users() {
            return [{ email: emailToRemove }]
          }
        }
      })
      return modalInstance.result.then(function() {
        return queuedHttp({
          method: 'DELETE',
          url: `/admin/user/${$scope.user._id}/secondaryemail`,
          data: {
            emailToRemove
          },
          headers: {
            // required for angular 1 to send data on delete which is valid
            'Content-type': 'application/json;charset=utf-8',
            'X-CSRF-Token': window.csrfToken
          }
        }).then(() =>
          setTimeout(
            () => (window.location.href = `/admin/user/${$scope.user._id}`),
            100
          )
        )
      })
    }

    $scope.openUnlinkOlModal = function() {
      const modalInstance = $modal.open({
        templateUrl: 'unlinkOlModalTemplate',
        controller: 'UnlinkOlModalController',
        resolve: {
          users() {
            return [$scope.user]
          }
        }
      })
      return modalInstance.result.then(() =>
        queuedHttp({
          method: 'DELETE',
          url: `/admin/user/${$scope.user._id}/overleaf`,
          headers: {
            'X-CSRF-Token': window.csrfToken
          }
        }).then(() =>
          setTimeout(
            () => (window.location.href = `/admin/user/${$scope.user._id}`),
            100
          )
        )
      )
    }

    // delete user
    $scope.openDeleteUserModal = function() {
      const modalInstance = $modal.open({
        templateUrl: 'deleteUsersModalTemplate',
        controller: 'DeleteUsersModalController',
        resolve: {
          users() {
            return [$scope.user]
          }
        }
      })
      return modalInstance.result.then(() => $scope.DeleteUser())
    }

    $scope.DeleteUser = function() {
      const { user } = $scope
      return queuedHttp({
        method: 'DELETE',
        url: `/admin/user/${user._id}`,
        headers: {
          'X-CSRF-Token': window.csrfToken
        }
      }).then(() =>
        setTimeout(() => (window.location.href = '/admin/user'), 100)
      )
    }

    $scope.refreshFeatures = function() {
      const { user } = $scope
      $scope.refreshingFeatures = true
      return queuedHttp({
        method: 'POST',
        url: `/admin/user/${user._id}/refresh_features`,
        headers: {
          'X-CSRF-Token': window.csrfToken
        }
      }).then(() => location.reload())
    }

    $scope.updateVisibleProjects = function() {
      $scope.visibleProjects = []

      return (() => {
        const result = []
        for (project of Array.from($scope.projects)) {
          let visible = true
          // Only show if it matches any search text
          if (
            $scope.searchText.value != null &&
            $scope.searchText.value !== ''
          ) {
            if (
              !project.name
                .toLowerCase()
                .match($scope.searchText.value.toLowerCase())
            ) {
              visible = false
            }
          }

          if (visible) {
            result.push($scope.visibleProjects.push(project))
          } else {
            // We dont want hidden selections
            result.push((project.selected = false))
          }
        }
        return result
      })()
    }

    return $scope.updateVisibleProjects()
  })

  App.controller('AdminProjectListItemController', $scope =>
    $scope.$watch('project.selected', function(value) {
      if (value != null) {
        return $scope.updateSelectedProjects()
      }
    })
  )

  App.controller('AdminDeleteProjectsModalController', function(
    $scope,
    $modalInstance,
    $timeout,
    projects
  ) {
    $scope.projectsToDelete = projects

    $scope.action = 'Delete'

    $scope.delete = () => $modalInstance.close()

    return ($scope.cancel = () => $modalInstance.dismiss('cancel'))
  })

  App.controller('UnlinkOlModalController', function(
    $scope,
    $modalInstance,
    $timeout,
    users
  ) {
    $scope.users = users

    $scope.unlink = () => $modalInstance.close()

    return ($scope.cancel = () => $modalInstance.dismiss('cancel'))
  })

  return App.controller('DeleteSecondaryEmailModalController', function(
    $scope,
    $modalInstance,
    $timeout,
    users
  ) {
    $scope.users = users

    $scope.delete = () => $modalInstance.close()

    return ($scope.cancel = () => $modalInstance.dismiss('cancel'))
  })
})
