import Backbone from 'backbone';
import Router from './metrics/router';
import metricsApp from './metrics/metricsApp';
import { MetricsView } from './metrics/views/metrics';
import registerHelpers from './metrics/helpers/handlebars.helpers';

metricsApp.init = function () {
  console.log("HELLO!")

  debugger
  registerHelpers()

  metricsApp.router = new Router();
  Backbone.history.start({ pushState: true, root: '/metrics' });

  var metricsView = new MetricsView();
};

export { metricsApp }
