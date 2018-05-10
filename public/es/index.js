import Backbone from 'backbone';
import Router from './metrics/router';
import metricsApp from './metrics/metrics_app';
import chartApp from './charts/chart_app';
import { MetricsView } from './metrics/views/metrics';

metricsApp.init = function () {
  metricsApp.router = new Router();
  Backbone.history.start({ pushState: true, root: '/metrics' });

  var metricsView = new MetricsView();
};

export { metricsApp, chartApp }
