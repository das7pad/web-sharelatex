/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
define([
	"base"
], App =>
	App.controller("ReferencesSearchModalController", function($scope, $modalInstance, $window, $timeout, ide, event_tracking) {

		if (!($scope.searchFeatureEnabled())) {
			return;
		}

		$scope.state = {
			queryText: "",
			searchResults: null,
			selectedIndex: null,
			currentlySearching: false,
			error: false
		};

		$scope.handleInputKeyDown = function(e) {
			if (e.keyCode === 40) {  // down
				e.preventDefault();
				$scope.moveSelectionForward();
				return;
			}

			if (e.keyCode === 38) {  // up
				e.preventDefault();
				$scope.moveSelectionBackward();
				return;
			}

			if (e.keyCode === 9) {  // tab & shift-tab
				e.preventDefault();
				if (e.shiftKey) {
					$scope.moveSelectionBackward();
				} else {
					$scope.moveSelectionForward();
				}
				return;
			}

			if (e.keyCode === 13) {  // enter
				e.preventDefault();
				$scope.acceptSelectedSearchResult();
				return;
			}

			if ([37, 39].includes(e.keyCode)) {  // left and right
				$scope.state.selectedIndex = null;
				return;
			}

			if ([8].includes(e.keyCode)) {  // backspace
				$scope.state.selectedIndex = null;
				$timeout($scope.doAutoSearch, 0);
				return;
			}

			// ignore shift-key alone and keypresses with alt/cmd/ctrl
			if ((e.keyCode === 16) || e.altKey || e.ctrlKey || e.metaKey) {
				return;
			}

			// for all other key strokes
			// do autosearch in next cycle
			$timeout($scope.doAutoSearch, 0);
		};

		$scope.doAutoSearch = function() {
			const { state } = $scope;
			if (state.queryText && (state.queryText.length >= 3)) {
				return $scope.doSearch();
			}
		};

		$scope.moveSelectionForward = function() {
			if ($scope.state.selectedIndex === null) {
				if ($scope.state.searchResults && ($scope.state.searchResults.length > 0)) {
					return $scope.state.selectedIndex = 0;
				}
			} else {
				if ($scope.state.searchResults && ($scope.state.searchResults.length > 0)) {
					$scope.state.selectedIndex++;
					const lastIndex = $scope.state.searchResults.length - 1;
					if ($scope.state.selectedIndex > lastIndex) {
						return $scope.state.selectedIndex = lastIndex;
					}
				}
			}
		};

		$scope.moveSelectionBackward = function() {
			if ($scope.state.selectedIndex === null) {
				// do nothing
				return;
			} else {
				if ($scope.state.searchResults && ($scope.state.searchResults.length > 0)) {
					$scope.state.selectedIndex--;
					if ($scope.state.selectedIndex < 0) {
						return $scope.state.selectedIndex = null;
					}
				}
			}
		};

		$scope.doSearch = function() {
			if ($scope.state.queryText === '') {
				return;
			}
			const opts = {
				query: $scope.state.queryText,
				_csrf: window.csrfToken
			};
			$scope.state.currentlySearching = true;
			ide.$http.post(`/project/${$scope.project_id}/references/search`, {
				query: $scope.state.queryText,
				_csrf: window.csrfToken
			}).then(
				function(successResponse) {
					$scope.state.searchResults = successResponse.data.hits;
					$scope.state.selectedIndex = null;
					$scope.state.currentlySearching = false;
					return $scope.state.error = false;
				},
				function(errorResponse) {
					console.error(">> error searching references", errorResponse);
					$scope.state.selectedIndex = null;
					$scope.state.currentlySearching = false;
					return $scope.state.error = true;
			});

			// stop searching state after 30 seconds
			return $timeout(
				() => $scope.state.currentlySearching = false
				, 30000
			);
		};

		$scope.selectIndex = function(index) {
			if ($scope.state.searchResults) {
				return $scope.state.selectedIndex = index;
			}
		};

		$scope.acceptSelectedSearchResult = function() {
			if ($scope.state.searchResults && ($scope.state.selectedIndex !== null)) {
				event_tracking.sendMB("bib-search-result-inserted");
				const result = $scope.state.searchResults[$scope.state.selectedIndex];
				return $modalInstance.close(result._source.EntryKey);
			}
		};

		return $scope.cancel = () => $modalInstance.dismiss('cancel');
	})
);
