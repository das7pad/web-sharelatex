/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
	"base"
], App =>
	App.controller("GithubSyncMergeModalController", function($scope, $modalInstance, $http, ide, mergeImmediately) {
		$scope.cancel = () => $modalInstance.dismiss();
		
		$scope.status = {};
		$scope.form =
			{message: ""};
		
		$scope.merge = function() {
			ide.editorManager.startIgnoringExternalUpdates();
			$scope.status.inflight = true;
			let data = {
				_csrf: window.csrfToken,
				message: $scope.form.message
			};
			return $http.post(`/project/${ide.project_id}/github-sync/merge`, data)
				.then(function() {
					$scope.status.inflight = false;
					$modalInstance.dismiss();
					ide.githubSyncManager.openGithubSyncModal();
					return ide.editorManager.stopIgnoringExternalUpdates();}).catch(function(response) {
					({ data } = response);
					$scope.form.error = data.error;
					$scope.status.inflight = false;
					return ide.editorManager.stopIgnoringExternalUpdates();
			});
		};
					
		if (mergeImmediately) {
			return $scope.merge();
		}
	})
);
