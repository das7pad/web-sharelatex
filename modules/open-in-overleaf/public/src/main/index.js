define([
        "base"
    ], App =>

        // For integration-module
        App.controller("OpenInOverleafGatewayController", function($scope, $http) {
            $scope.error = false;

            $scope.handleGateway = function(base64EncodedInput) {
                let input = JSON.parse(atob(base64EncodedInput));

                if (!_validateInput(input)) {
                    $scope.error = true;
                } else if (input.error) {
                    $scope.serverError = input.error;
                } else if (input.action === 'store') {
                    _storeParamsAndRedirect(input.params, input.target);
                } else if (input.action === 'submit') {
                    _submitParamsAndOpen(_retrieveParamsIfMissing(input.params), input.csrfToken);
                }
            };

            function _validateInput(input) {
                if (input.error) {
                    return true;
                }
                if (input.action === 'store' && input.target !== "" && input.params) {
                    return true;
                }
                return input.action === 'submit' && input.params;
            };

            function _storeParamsAndRedirect(params, target) {
                window.sessionStorage.setItem('openInOverleaf', JSON.stringify(params));
                window.location.replace(target);
            };

            function _retrieveParamsIfMissing(params) {
                if (Object.keys(params).length === 0) {
                    return JSON.parse(window.sessionStorage.getItem('openInOverleaf')) || {};
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
                    if (response.error) {
                        $scope.serverError = response.error;
                    } else if (response.data && response.data.redirect) {
                        window.location.replace(response.data.redirect);
                    } else {
                        $scope.error = true;
                    }
                }, function errorCallback(response) {
                    if (response.data && response.data.error) {
                        $scope.serverError = response.data.error;
                    } else {
                        $scope.error = true;
                    }
                });
            };
        })
);
