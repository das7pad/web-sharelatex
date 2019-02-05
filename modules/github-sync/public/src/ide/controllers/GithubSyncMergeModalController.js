define(['base'], App =>
  App.controller('GithubSyncMergeModalController', function(
    $scope,
    $modalInstance,
    $http,
    ide,
    mergeImmediately
  ) {
    $scope.cancel = () => $modalInstance.dismiss()

    $scope.status = {}
    $scope.form = { message: '' }

    $scope.merge = function() {
      ide.editorManager.startIgnoringExternalUpdates()
      $scope.status.inflight = true
      let data = {
        _csrf: window.csrfToken,
        message: $scope.form.message
      }
      return $http
        .post(`/project/${ide.project_id}/github-sync/merge`, data)
        .then(function() {
          $scope.status.inflight = false
          $modalInstance.dismiss()
          ide.githubSyncManager.openGithubSyncModal()
          ide.editorManager.stopIgnoringExternalUpdates()
        })
        .catch(function({ data }) {
          $scope.form.error = data.error
          $scope.status.inflight = false
          ide.editorManager.stopIgnoringExternalUpdates()
        })
    }

    if (mergeImmediately) {
      $scope.merge()
    }
  }))
