import Backbone from 'backbone'
import { Metrics } from '../collections/metrics'
import { LagsView } from './lags'
import { MetricView } from './metric'

export const MetricsView = Backbone.View.extend({
  el: '#metrics-container',

  initialize: function() {
    this.metrics = new Metrics()
    this.metrics.fetch()

    this.listenTo(this.metrics, 'add', this.render)
    this.listenTo(this.metrics, 'sync', this.showContact)

    new LagsView() // eslint-disable-line no-new
  },

  render: function(metric) {
    metric.view = new MetricView({
      model: metric
    })
    this.$el.append(metric.view.render().el)
  },

  showContact: function() {
    $('.metrics-contact').removeClass('hide')
  }
})
