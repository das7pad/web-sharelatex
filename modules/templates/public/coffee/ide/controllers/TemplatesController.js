/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
	"base",
	"ide/permissions/PermissionsManager",
	"moment"
], function(App, PermissionsManager, moment) {

	App.controller("TemplatesController", ($scope, $modal, ide) =>
		$scope.openPublishTemplateModal = function() {
			const resetState = () => $scope.problemTalkingToTemplateApi = false;

			resetState();

			const modal = $modal.open({
				templateUrl: "publishProjectAsTemplateModalTemplate",
				controller: "PublishProjectAsTemplateModalController",
				scope:$scope
			});
			return modal.result.then(resetState, resetState);
		}
	);

	return App.controller("PublishProjectAsTemplateModalController", function($scope, $modalInstance, ide, $http) {
		const user_id = ide.$scope.user.id;
		$scope.templateDetails = {exists:false};

		$scope.state = {
			publishInflight: false,
			unpublishInflight: false
		};

		const problemTalkingToTemplateApi = () => $scope.problemTalkingToTemplateApi = true;

		const refreshPublishedStatus = () =>
			$http.get(`/project/${ide.project_id}/template`)
				.then(function(response) {
					const { data } = response;
					$scope.templateDetails = data;
					$scope.templateDetails.publishedDate = moment(data.publishedDate).format("Do MMM YYYY, h:mm a");
					return $scope.templateDetails.description = data.description;}).catch(() => problemTalkingToTemplateApi())
		;

		refreshPublishedStatus();
		$scope.$watch($scope.problemTalkingToTemplateApi, function(value) {
			if (value != null) {
				return refreshPublishedStatus();
			}
		});

		const updateProjectDescription = () =>
			$http.post(`/project/${ide.project_id}/template/description`, {
				description: $scope.templateDetails.description,
				_csrf: window.csrfToken
			})
		;
			
		// Save the description on modal close
		$modalInstance.result.finally(() => updateProjectDescription());

		$scope.publishTemplate = function() {
			$scope.state.publishInflight = true;
			return updateProjectDescription()
				.then(() =>
					$http
						.post(`/project/${ide.project_id}/template/publish`, {
							_csrf: window.csrfToken
						})
						.then(function() {
							refreshPublishedStatus();
							return $scope.state.publishInflight = false;}).catch(() => problemTalkingToTemplateApi())).catch(() => problemTalkingToTemplateApi());
		};
					

		$scope.unpublishTemplate = function() {
			$scope.state.unpublishInflight = true;
			return $http
				.post(`/project/${ide.project_id}/template/unpublish`, {
					_csrf: window.csrfToken
				})
				.then(function() {
					refreshPublishedStatus();
					return $scope.state.unpublishInflight = false;}).catch(() => problemTalkingToTemplateApi());
		};

		return $scope.cancel = () => $modalInstance.dismiss();
	});
});
