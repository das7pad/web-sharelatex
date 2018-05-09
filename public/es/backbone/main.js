// = require clean-theme/metrics/backbone/load

// global Backbone
var metricsApp = metricsApp || {};

$(function () {
  'use strict';

  metricsApp.router = new metricsApp.Router();
  Backbone.history.start({ pushState: true, root: '/metrics' });

  var metricsView = new metricsApp.MetricsView();
});
