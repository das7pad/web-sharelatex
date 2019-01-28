/* global $, METRICS_RESOURCE_ID, METRICS_RESOURCE_TYPE */

import Backbone from 'backbone'
import template from '../templates/metrics.metric.handlebars'
import footerTemplate from '../templates/metrics.metric-footer.handlebars'
import lag from '../helpers/lag'
import merge from 'lodash/merge'
import metricsApp from '../metrics_app'

import chartApp from '../../charts/chart_app'

export const MetricView = Backbone.View.extend({
  tagName: 'div',
  className: 'metric-col col-md-6 print-col-no-collapse-6',
  template: template,
  footerTemplate: footerTemplate,

  chart: null,

  events: {
    'click a.metric-refresh': 'refresh'
  },

  initialize: function() {
    this.listenTo(Backbone, 'metrics:refresh', this.render)
  },

  /**
   * render the metric view. Fetch the data via the model and stop after
   * displaying the loading view. The render will be called again from the
   * model; once the data has been fetched
   */
  render: function() {
    this.displayLoadingOverlay()
    this.model.fetchData()
    this.renderTemplate()
    this.csvUpdate()
    return this
  },

  renderWithData: function(data) {
    this.renderTemplate(data)
    this.removeOverlay()
    return this
  },

  /**
   * render the template. It needs to separate the header from the body as
   * replacing the whole html for of the chart container would prevent a nice
   * chart update animation
   */
  renderTemplate: function(chartData) {
    if (this.$el.html().length === 0) {
      // render the main template only once
      this.$el.html(
        this.template({
          title: this.model.get('title'),
          tooltip: this.model.get('tooltip')
        })
      )
    }

    // the header & footer are always re-rendered
    this.renderFooterTemplate()

    if (chartData) {
      // create or update the chart
      this.renderChart(chartData)
    }
  },

  /**
   * render the metric header data (title & lags)
   */
  renderFooterTemplate: function() {
    this.$('.metric-footer-container').html(
      this.footerTemplate({
        selectedLag: lag.selected
      })
    )
  },

  /**
   * render the chart. Either create or update if it exist already
   */
  renderChart: function(data) {
    var $svgElt = this.$('svg')
    var chartArguments = [this.model.get('key')]
    chartArguments = merge(chartArguments, this.model.get('options'))
    chartArguments.push('lag-' + lag.selected)
    var chartOptions = chartApp.getChartOptions.apply(this, chartArguments)
    if (this.chart) {
      this.chart = chartApp.updateChart($svgElt, data, chartOptions, this.chart)
    } else {
      this.chart = chartApp.addChart($svgElt, data, chartOptions)
    }
  },

  displayLoadingOverlay: function() {
    this.$('.metric-overlay-error').hide()
    this.$('.metric-overlay-loading').show()
    this.$('.metric-overlay-backdrop').show()
  },

  displayErrorOverlay: function() {
    this.$('.metric-overlay-loading').hide()
    this.$('.metric-overlay-error').show()
    this.$('.metric-overlay-backdrop').show()
  },

  removeOverlay: function() {
    this.$('.metric-overlay-loading').fadeOut('fast')
    this.$('.metric-overlay-error').fadeOut('fast')
    this.$('.metric-overlay-backdrop').fadeOut('fast')
  },

  csvUpdate: function() {
    var $csvElt = $('#csv')
    if ($csvElt.length === 0) return

    var router = metricsApp.router
    var path =
      '/metrics/csv?' +
      'resource_id=' +
      METRICS_RESOURCE_ID +
      '&resource_type=' +
      METRICS_RESOURCE_TYPE +
      '&start_date=' +
      router.startDate.unix() +
      '&end_date=' +
      router.endDate.unix() +
      '&lag=' +
      lag.selected
    $csvElt[0].href = path
  },

  refresh: function() {
    this.render()
    return false
  }
})
