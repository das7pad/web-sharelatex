/*global Backbone */
var metricsApp = metricsApp || {};

$(function () {
  'use strict';

  metricsApp.MetricsView = Backbone.View.extend({
    el: "#metrics-container",

    initialize: function() {
      this.metrics = new metricsApp.Metrics();
      this.metrics.fetch();

      this.listenTo(this.metrics, 'add', this.render);

      new metricsApp.LagsView();
    },

    render: function(metric) {
      metric.view = new metricsApp.MetricView({
        model: metric
      });
      this.$el.append(metric.view.render().el);
    },

  });

});
