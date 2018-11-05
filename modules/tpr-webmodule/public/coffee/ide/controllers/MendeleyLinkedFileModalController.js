/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

define([
	"base"
], App =>

	App.controller("MendeleyLinkedFileModalController", [
		"$scope", "ide", "$timeout", "$window", "$interval", "event_tracking", "sixpack",
		function($scope,   ide,   $timeout,   $window,   $interval,   event_tracking,   sixpack) {

			const provider = 'mendeley';
			const features = ide.$scope.user != null ? ide.$scope.user.features : undefined;
			$scope.userHasProviderFeature = (features != null ? features.mendeley : undefined) || (features != null ? features.references : undefined);
			$scope.userHasProviderLink = __guard__(ide.$scope.user != null ? ide.$scope.user.refProviders : undefined, x => x[provider]);

			$scope.canLoadBibtex = () => $scope.userHasProviderFeature && $scope.userHasProviderLink;

			$scope.state = {
				fetchingGroups: false,
				inflight: false,
				error: false,
				errorType: 'default'  // || 'expired' || 'forbidden'
			};
			$scope.data = {
				isInitialized: false,
				groups: null,
				selectedGroupId: null
			};

			const _handleError = function(err) {
				if (err.status === 401) {
					return _reset({error: 'expired'});
				} else if (err.status === 403) {
					return _reset({error: 'forbidden'});
				} else if (err.status === 400) {
					return _reset({error: 'default'});
				} else {
					return _reset({error: true});
				}
			};

			var _reset = function(opts) {
				if (opts == null) { opts = {}; }
				$scope.state.fetchingGroups = false;
				$scope.state.fetchingBibtexPreview = false;
				$scope.state.inflight = false;
				if (opts.error != null) {
					$scope.state.error = true;
					if (opts.error === true) {
						return $scope.state.errorType = 'default';
					} else {
						return $scope.state.errorType = opts.error;
					}
				} else {
					return $scope.state.error = false;
				}
			};

			$scope.hasGroups = () => ($scope.data.groups != null) && ($scope.data.groups.length > 0);

			$scope.fetchGroups = function() {
				if (!$scope.canLoadBibtex()) { return; }
				_reset();
				$scope.state.fetchingGroups = true;
				return ide.$http.get("/mendeley/groups", {disableAutoLoginRedirect: true})
					.then(function(resp) {
						const { data } = resp;
						$scope.data.groups = data.groups;
						// $scope.data.groups = [] # DEBUG
						$scope.data.selectedGroup = null;
						$scope.data.isInitialized = true;
						return _reset();}).catch(function(err) {
						console.warn(err);
						return _handleError(err);
				});
			};

			const validate = function() {
				const {name, isInitialized} = $scope.data;
				if ((name == null) || (name.length === 0)) {
					return $scope.state.valid = false;
				} else if ((isInitialized == null)) { 
					return $scope.state.valid = false;
				} else {
					return $scope.state.valid = true;
				}
			};

			$scope.$watch('data.name', validate);

			$scope.$on('create', function() {
				let payload;
				if (!$scope.data.isInitialized) { return; }
				if (
					!$scope.data.isInitialized ||
					!$scope.data.name
				) { return; }
				if ($scope.hasGroups()) {
					// Import from selected Group
					if ($scope.data.selectedGroupId) {
						payload = {
							group_id: $scope.data.selectedGroupId
						};
					} else {
						payload = {};
					}
				} else {
					// Import from Account
					payload = {};
				}
				event_tracking.send("references-mendeley", "modal", "import-bibtex");
				$scope.state.inflight = true;
				return ide.fileTreeManager
					.createLinkedFile($scope.data.name, $scope.parent_folder, 'mendeley', payload)
					.then(function() {
						$scope.$emit('references:should-reindex', {});
						$scope.$emit('done');
						return _reset();}).catch(err => _handleError(err));
			});

			const _init = function() {
				if (!$scope.canLoadBibtex()) { return; }
				$scope.state.fetchingGroups = true;
				return $timeout(
					() => $scope.fetchGroups()
					, 500
				);
			};
			_init();

			// Stuff for managing trials and linkages
			$scope.startFreeTrial = function(source) {
				let plan = 'collaborator_free_trial_7_days';
				if (typeof ga === 'function') {
					ga('send', 'event', 'subscription-funnel', 'upgraded-free-trial', source);
				}
				const w = window.open();
				const go = function() {
					$scope.startedFreeTrial = true;
					return w.location = `/user/subscription/new?planCode=${plan}&ssp=true`;
				};
				if ($scope.shouldABTestPlans) {
					return sixpack.participate('plans-1610', ['default', 'heron', 'ibis'], function(chosenVariation, rawResponse){
						if (['heron', 'ibis'].includes(chosenVariation)) {
							plan = `collaborator_${chosenVariation}`;
						}
						return go();
					});
				} else {
					return go();
				}
			};

			$scope.linkAccount = function() {
				const authWindow = $window.open(`/${provider}/oauth`, "reference-auth", "width=700,height=500");
				event_tracking.send(`references-${provider}`, "modal", "start-link-account");
				var poller = $interval(function() {
					// We can get errors when trying to access the URL before it returns
					// to a ShareLaTeX URL (security exceptions)
					let pathname;
					try {
						pathname = __guard__(authWindow != null ? authWindow.location : undefined, x1 => x1.pathname);
					} catch (e) {
						pathname = null;
					}
					if (pathname === "/user/settings") {
						authWindow.close();
						event_tracking.send(`references-${provider}`, "modal", "end-link-account");
						$scope.userHasProviderLink = true;
						ide.$scope.user.refProviders[provider] = true;
						$timeout(
							$scope.fetchGroups()
							, 500
						);
						return $interval.cancel(poller);
					}
				}
				, 1000);
				return true; // See https://github.com/angular/angular.js/issues/4853#issuecomment-28491586
			};


			return window._S = $scope;
		}
	])
);

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}