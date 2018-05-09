var metricsApp = metricsApp || {};

$(function () {
  'use strict';

  metricsApp.Metric = Backbone.Model.extend({

    /**
     * fetch the metric's data for a given lag
     */
    fetchData: function() {
      var location = this.get('location') || '';
      if(location.length === 0) {
        location = METRICS_ENDPOINT + this.get('path');
      }

      $.ajax({
        url: location,
        data: {
          resource_id: METRICS_RESOURCE_ID,
          resource_type: METRICS_RESOURCE_TYPE,
          lag: metricsApp.lag.selected,
          start_date: metricsApp.router.startDate.unix(),
          end_date: metricsApp.router.endDate.unix(),
        },
        type: 'GET',
        success: _.bind(function(metricData) {
          this.view.renderWithData(metricData.data);
        }, this),
        error: _.bind(function() {
          this.view.displayErrorOverlay();
        }, this),
      });

    },

  });

});
