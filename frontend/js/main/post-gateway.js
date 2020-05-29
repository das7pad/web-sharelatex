import App from '../base'
import getMeta from '../utils/meta'

export default App.controller('PostGatewayController', function($scope) {
  $scope.handleGateway = function() {
    const { params } = getMeta('ol-gateway-data')
    params.viaGateway = 'true'
    Object.keys(params).forEach(param => {
      $('<input>')
        .attr({
          type: 'hidden',
          name: param,
          value: params[param]
        })
        .appendTo('#gateway')
    })
    $('#gateway').submit()
  }
})
