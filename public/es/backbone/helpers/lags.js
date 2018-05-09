var metricsApp = metricsApp || {};

$(function () {
  'use strict';

  metricsApp.lag = {};
  metricsApp.lag.names = {
    daily: 'Day',
    weekly: 'Week',
    monthly: 'Month',
  };
  metricsApp.lag.keys = _.keys(metricsApp.lag.names);
  metricsApp.lag.selected = metricsApp.lag.keys[0];

  // format the lags for the handlebar template
  metricsApp.lag.mapForTemplate = function() {
    return _.map(metricsApp.lag.keys, function(lagKey, idx) {
      return {
        key: lagKey,
        name: metricsApp.lag.names[lagKey],
        isSelected: lagKey === metricsApp.lag.selected,
      };
    });
  };
});
