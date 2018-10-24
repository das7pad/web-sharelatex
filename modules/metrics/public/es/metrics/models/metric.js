/* global $ */

import lag from '../helpers/lag';
import metricsApp from '../metrics_app';
import { bind } from 'underscore';

export const Metric = Backbone.Model.extend({
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
        lag: lag.selected,
        start_date: metricsApp.router.startDate.unix(),
        end_date: metricsApp.router.endDate.unix(),
      },
      type: 'GET',
      success: bind(function(metricData) {
        this.view.renderWithData(metricData.data);
      }, this),
      error: bind(function() {
        this.view.displayErrorOverlay();
      }, this),
    });

  },

});
