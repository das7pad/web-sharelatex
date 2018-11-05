/* global METRICS_ENDPOINT, METRICS_RESOURCE_TYPE, METRICS_RESOURCE_ID */

import Backbone from 'backbone'
import { Metric } from '../models/metric'

export const Metrics = Backbone.Collection.extend({
  model: Metric,

  initialize: function() {
    this.url = METRICS_ENDPOINT + '/'
    var queryString = ''
    if (METRICS_RESOURCE_TYPE && METRICS_RESOURCE_TYPE.length > 0) {
      queryString += queryString.length === 0 ? '?' : '&'
      queryString += 'resource_type=' + METRICS_RESOURCE_TYPE
      queryString += '&resource_id=' + METRICS_RESOURCE_ID
    }
    this.url += queryString
  }
})
