var metricsApp = metricsApp || {};

$(function () {
  'use strict';

   metricsApp.Metrics = Backbone.Collection.extend({
    model: metricsApp.Metric,

    initialize: function() {
      this.url = METRICS_ENDPOINT + '/';
      var queryString = '';
      if(METRICS_RESOURCE_ID && METRICS_RESOURCE_ID.length > 0) {
        queryString += '?resource_id=' + METRICS_RESOURCE_ID;
      }
      if(METRICS_RESOURCE_TYPE && METRICS_RESOURCE_TYPE.length > 0) {
        queryString += (queryString.length === 0) ? '?' : '&';
        queryString += 'resource_type=' + METRICS_RESOURCE_TYPE;
      }
      this.url += queryString;
    },
  });

});
