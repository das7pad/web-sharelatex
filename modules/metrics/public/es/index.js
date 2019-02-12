import Backbone from 'backbone'
import Router from './metrics/router'
import metricsApp from './metrics/metrics_app'
import chartApp from './charts/chart_app'
import institutionHub from './charts/institutionHub'
import portal from './charts/portal'
import { MetricsView } from './metrics/views/metrics'

metricsApp.init = function() {
  metricsApp.router = new Router()
  Backbone.history.start({ pushState: true, root: '/metrics' })

  // eslint-disable-next-line no-new
  new MetricsView()
}

export { metricsApp, chartApp, institutionHub, portal }
