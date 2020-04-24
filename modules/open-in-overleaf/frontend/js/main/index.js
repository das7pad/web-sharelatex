define(['../../../../../frontend/js/base'], App =>
  // For integration-module
  App.controller('OpenInOverleafGatewayController', function(
    $scope,
    $http,
    localStorage
  ) {
    $scope.error = false

    $scope.handleGateway = function() {
      const input = JSON.parse($('#overleaf-gateway-data').text())
      _addReferrer(input.params)

      if (!_validateInput(input)) {
        $scope.error = true
      } else if (input.error) {
        $scope.serverError = input.error
      } else if (input.action === 'store') {
        _storeParamsAndRedirect(input.params, input.target)
      } else if (input.action === 'submit') {
        _submitParamsAndOpen(
          _retrieveParamsIfMissing(input.params),
          input.csrfToken
        )
      }
    }

    function _addReferrer(params) {
      if (document.referrer && !params.referrer) {
        params.referrer = document.referrer
      }
    }

    function _validateInput(input) {
      if (input.error) {
        return true
      }
      if (input.action === 'store' && input.target !== '' && input.params) {
        return true
      }
      return input.action === 'submit' && input.params
    }

    function _storeParamsAndRedirect(params, target) {
      _addReferrer(params)
      window.sessionStorage.setItem('openInOverleaf', JSON.stringify(params))
      window.location.replace(target)
    }

    function _retrieveParamsIfMissing(params) {
      if (Object.keys(params).filter(k => k !== 'referrer').length === 0) {
        return JSON.parse(window.sessionStorage.getItem('openInOverleaf')) || {}
      }
      return params
    }

    function _submitParamsAndOpen(params, csrfToken) {
      params._csrf = csrfToken
      $http({
        method: 'POST',
        url: window.location.pathname,
        data: params
      }).then(
        function successCallback(response) {
          if (response.error) {
            $scope.serverError = response.error
          } else if (response.data && response.data.redirect) {
            if (params.rich_text === 'true') {
              localStorage(
                'editor.mode.' + response.data.projectId,
                'rich-text'
              )
            }
            window.location.replace(response.data.redirect)
          } else {
            $scope.error = true
          }
        },
        function errorCallback(response) {
          if (response.data && response.data.error) {
            $scope.serverError = response.data.error
          } else {
            $scope.error = true
          }
        }
      )
    }
  }))
