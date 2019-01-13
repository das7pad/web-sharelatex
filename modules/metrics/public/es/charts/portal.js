/* global $ */

import chartInitializer from './chartInitializer'

const portal = {
  getDataAndInitCharts: () => {
    chartInitializer.getDataAndInitChart($('#institutional-departments-chart'))
  }
}

export default portal
