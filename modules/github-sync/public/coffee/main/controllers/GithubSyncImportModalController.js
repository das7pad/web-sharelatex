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
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
	"base"
], App =>
	App.controller("GithubSyncImportModalController", function($scope, $modalInstance, $http) {
		$scope.cancel = () => $modalInstance.dismiss();
			
		$scope.status = {
			loading: true,
			error: false
		};
		
		$http.get("/user/github-sync/status", { disableAutoLoginRedirect: true })
			.then(function(response) {
				const user = response.data;
				$scope.status.user = user;
				if (!user.enabled) {
					return $scope.status.loading = false;
				} else {
					return $http.get("/user/github-sync/repos", { disableAutoLoginRedirect: true })
						.then(function(response) {
							const { data } = response;
							$scope.status.loading = false;
							return $scope.status.repos = data.repos;}).catch(function(response) {
							const { data, status } = response;
							if (status != null) {
								return $scope.status.error = { status };
							} else {
								return $scope.status.error = true;
							}
					});
				}}).catch(() => $scope.status.error = true);
				
		return $scope.importRepo = function(repo) {
			$scope.status.inflight = true;
			return $http
				.post("/project/new/github-sync", {
					_csrf: window.csrfToken,
					projectName: repo.name,
					repo: repo.full_name,
					disableAutoLoginRedirect: true
				})
				.then(function(response) {
					const { data } = response;
					const { project_id } = data;
					return window.location = `/project/${project_id}`;}).catch(function(response) {
					const { data, status } = response;
					$scope.status.inflight = false;
					if (status != null) {
						return $scope.status.error = { status };
					} else {
						return $scope.status.error = true;
					}
			});
		};
	})
);
					

