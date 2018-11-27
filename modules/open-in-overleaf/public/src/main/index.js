define([
        "base"
    ], App =>

        // For integration-module
        App.controller("OpenInOverleafGatewayController", function($scope, $http) {
            $scope.error = false;

            $scope.handleGateway = function(base64EncodedInput) {
                let input = JSON.parse(atob(base64EncodedInput));

                if (!_validateInput(input.params, input.action, input.target)) {
                    $scope.error = true;
                    return;
                }
                if (input.action === 'store') {
                    _storeParamsAndRedirect(input.params, input.target);
                } else if (input.action === 'submit') {
                    _submitParamsAndOpen(_retrieveParamsIfMissing(input.params), input.csrfToken);
                }
            };

            function _validateInput(params, action, target) {
                if (action === 'store' && target !== "" && params) {
                    return true;
                }
                return action === 'submit' && params;
            };

            function _storeParamsAndRedirect(params, target) {
                window.sessionStorage.setItem('openInOverleaf', JSON.stringify(params));
                window.location.replace(target);
            };

            function _retrieveParamsIfMissing(params) {
                if (Object.keys(params).length === 0) {
                    return JSON.parse(window.sessionStorage.getItem('openInOverleaf'));
                }
                return params;
            };

            function _submitParamsAndOpen(params, csrfToken) {
                params._csrf = csrfToken;
                $http({
                    method: 'POST',
                    url: window.location.pathname,
                    data: params
                }).then(function successCallback(response) {
                    if (response.data && response.data.redirect) {
                        window.location.replace(response.data.redirect);
                    } else {
                        $scope.error = true;
                    }
                }, function errorCallback(response) {
                    $scope.error = true;
                });
            };
        })
);
